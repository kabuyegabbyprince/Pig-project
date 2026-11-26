import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicNavbar from "@/components/public/public-navbar";
import PublicFooter from "@/components/public/public-footer";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  let members: Awaited<ReturnType<typeof prisma.teamMember.findMany>> = [];
  try {
    members = await prisma.teamMember.findMany({
      where: { isPublished: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    console.error("Failed to load team members:", error);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <PublicNavbar activePath="/team" />

      <section
        className="relative overflow-hidden bg-[#101827] pt-28 pb-14 sm:pt-32 sm:pb-16"
        style={{
          background:
            "linear-gradient(165deg, rgba(16,24,39,0.97) 0%, rgba(10,14,23,1) 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#FF8A00]/10 blur-3xl"
        />
        <div className="app-container relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
              Dedicated Leadership
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl text-balance">
              People behind the project
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              Working together on sustainable livestock empowerment, veterinary health, and
              community revolving funds across Rwanda.
            </p>
            {members.length > 0 && (
              <div className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span className="tabular-nums text-white">{members.length}</span>
                <span>{members.length === 1 ? "team member" : "team members"}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="app-container mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
            <p className="text-sm font-medium">
              Team profiles are currently being synchronized. Please check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <article
                key={member.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="aspect-[4/3] overflow-hidden bg-slate-50">
                  {member.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={member.photoUrl}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-orange-50 text-3xl font-bold text-[#101827]">
                      {member.fullName
                        .split(" ")
                        .map((part: string) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "TM"}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-4 p-5 sm:p-6">
                  <div className="space-y-2.5">
                    <div>
                      <h2 className="text-lg font-bold text-[#101827]">{member.fullName}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-semibold text-[#FF8A00]">{member.role}</span>
                        {member.specialization && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-500">{member.specialization}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {member.bio ? (
                      <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">
                        {member.bio}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      {member.showEmailPublic && member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="hover:text-[#FF8A00] transition-colors"
                        >
                          Email
                        </a>
                      ) : null}
                      {member.showPhonePublic && member.phone ? (
                        <a
                          href={`tel:${member.phone}`}
                          className="hover:text-[#FF8A00] transition-colors"
                        >
                          Call
                        </a>
                      ) : null}
                      {member.showLinkedinPublic && member.linkedinUrl ? (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#FF8A00] transition-colors"
                        >
                          LinkedIn
                        </a>
                      ) : null}
                    </div>

                    <Link
                      href={`/team/${member.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF8A00] hover:text-[#101827] transition-colors whitespace-nowrap"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#101827] px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors shadow-xs whitespace-nowrap"
          >
            <span>Back to Home</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
