import type { GalleryItem, TeamMember, WebsiteContent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublishedGalleryItems, getPublishedGroundStories } from "@/lib/gallery";
import { HomePageClient } from "./HomePageClient";

export const dynamic = "force-dynamic";

type LitterBirthAggregate = {
  _sum: {
    numberBorn: number | null;
  };
};

type PigReturnAggregate = {
  _sum: {
    quantity: number | null;
  };
};

export default async function PublicHomePage() {
  let totalBeneficiaries = 0;
  let assignedPigsCount = 0;
  let litters: LitterBirthAggregate = { _sum: { numberBorn: 0 } };
  let returnedPigsCount = 0;
  let teamMembers: TeamMember[] = [];
  let galleryItems: GalleryItem[] = [];
  let stories: GalleryItem[] = [];
  let heroContent: WebsiteContent | null = null;

  try {
    const [
      beneficiariesCount,
      activePigs,
      distributions,
      littersAgg,
      pigReturnsAgg,
      returnedPigletsCount,
      fetchedTeamMembers,
      fetchedGalleryItems,
      fetchedStories,
      fetchedHeroContent,
    ] = await Promise.all([
      prisma.beneficiary.count({ where: { deletedAt: null } }),
      prisma.pig.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          status: true,
          currentBeneficiaryId: true,
          ownerMemberId: true,
        },
      }),
      prisma.pigDistribution.findMany({
        select: { pigId: true },
      }),
      prisma.litter.aggregate({ _sum: { numberBorn: true } }),
      prisma.pigReturn.aggregate({ _sum: { quantity: true } }) as Promise<PigReturnAggregate>,
      prisma.piglet.count({
        where: {
          status: {
            in: ["RETURNED", "AVAILABLE_FOR_REDISTRIBUTION", "REDISTRIBUTED"],
          },
        },
      }),
      prisma.teamMember.findMany({
        where: { isPublished: true, isFeatured: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        take: 4,
      }),
      getPublishedGalleryItems(3),
      getPublishedGroundStories(6),
      prisma.websiteContent.findFirst({
        where: { page: "home", section: "hero" },
      }),
    ]);

    totalBeneficiaries = beneficiariesCount;
    litters = littersAgg;
    teamMembers = fetchedTeamMembers;
    galleryItems = fetchedGalleryItems;
    stories = fetchedStories;
    heroContent = fetchedHeroContent;

    const activePigIds = new Set(activePigs.map((p) => p.id));
    const assignedPigIds = new Set<string>();
    for (const p of activePigs) {
      if (
        p.currentBeneficiaryId !== null ||
        p.ownerMemberId !== null ||
        p.status === "DISTRIBUTED" ||
        p.status === "REDISTRIBUTED"
      ) {
        assignedPigIds.add(p.id);
      }
    }
    for (const d of distributions) {
      if (d.pigId && activePigIds.has(d.pigId)) {
        assignedPigIds.add(d.pigId);
      }
    }
    assignedPigsCount = assignedPigIds.size;

    const returnBatchQty = pigReturnsAgg._sum.quantity ?? 0;
    returnedPigsCount = returnBatchQty > 0 ? returnBatchQty : returnedPigletsCount;
  } catch (error) {
    console.error("Failed to fetch homepage data from database:", error);
  }

  const heroData = {
    title: heroContent?.title || "One Piglet. One Family. A Fund That Keeps Moving.",
    description:
      heroContent?.description ||
      "Supporting vulnerable families in Rwanda through livestock empowerment, community accountability, and a sustainable revolving fund.",
    primaryButtonText: heroContent?.primaryButtonText || "Learn How It Works",
    primaryButtonLink: heroContent?.primaryButtonLink || "#how-it-works",
    secondaryButtonText: heroContent?.secondaryButtonText || "See Our Impact",
    secondaryButtonLink: heroContent?.secondaryButtonLink || "#impact",
    imageUrl: heroContent?.imageUrl || "/pig-hero-real.jpg",
    imageAlt: heroContent?.imageAlt || "Pig production and community support in Rwanda",
  };

  return (
    <HomePageClient
      heroData={heroData}
      totalBeneficiaries={totalBeneficiaries}
      totalPigsDistributed={assignedPigsCount}
      litterbornCount={litters._sum.numberBorn ?? 0}
      returnedPiglets={returnedPigsCount}
      teamMembers={teamMembers}
      galleryItems={galleryItems}
      stories={stories}
    />
  );
}
