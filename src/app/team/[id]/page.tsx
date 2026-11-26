import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail, Phone } from "lucide-react";
import PublicNavbar from "@/components/public/public-navbar";
import PublicFooter from "@/components/public/public-footer";

export const dynamic = "force-dynamic";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await prisma.teamMember.findFirst({
    where: { id, isPublished: true },
  });

  if (!member) {
    return (
      <div className="min-h-screen bg-white text-slate-900 antialiased">
        <PublicNavbar activePath="/team" />
        <main className="mx-auto max-w-3xl px-4 pt-36 pb-20 text-center">
          <h1 className="text-3xl font-bold text-[#101827]">Team member not found</h1>
          <p className="mt-4 text-sm text-slate-500">
            This profile is not available or has not been published yet.
          </p>
          <Link
            href="/team"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#101827] px-6 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-[#1f2937] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-[#FF8A00]" />
            <span>Back to Team</span>
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <PublicNavbar activePath="/team" />

      <section
        className="relative overflow-hidden bg-[#101827] pt-28 pb-12 sm:pt-32 sm:pb-14"
        style={{
          background:
            "linear-gradient(165deg, rgba(16,24,39,0.97) 0%, rgba(10,14,23,1) 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#FF8A00]/10 blur-3xl"
        />
        <div className="app-container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/team"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF8A00] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Our Team</span>
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl break-words text-balance">
            {member.fullName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-[#FF8A00]">{member.role}</span>
            {member.specialization && (
              <>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="text-slate-300">{member.specialization}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <main className="app-container mx-auto max-w-6xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] lg:p-10">
            <div>
              <div className="aspect-square w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50">
                {member.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={member.photoUrl}
                    alt={member.fullName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-orange-50 text-4xl font-bold text-[#101827]">
                    {member.fullName
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "TM"}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-6">
              {member.bio && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Biography
                  </h2>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
                    {member.bio}
                  </p>
                </div>
              )}

              {member.responsibilities && (
                <div className="border-t border-slate-100 pt-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Responsibilities
                  </h2>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
                    {member.responsibilities}
                  </p>
                </div>
              )}

              {(member.showEmailPublic && member.email) ||
              (member.showPhonePublic && member.phone) ||
              (member.showLinkedinPublic && member.linkedinUrl) ? (
                <div className="grid gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-2">
                  {member.showEmailPublic && member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="inline-flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 hover:border-[#FF8A00]/50 hover:bg-white hover:text-[#101827] transition-colors break-all"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#FF8A00]" />
                      <span className="truncate">{member.email}</span>
                    </a>
                  )}
                  {member.showPhonePublic && member.phone && (
                    <a
                      href={`tel:${member.phone}`}
                      className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 hover:border-[#FF8A00]/50 hover:bg-white hover:text-[#101827] transition-colors"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-[#FF8A00]" />
                      <span>{member.phone}</span>
                    </a>
                  )}
                  {member.showLinkedinPublic && member.linkedinUrl && (
                    <a
                      href={member.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 hover:border-[#FF8A00]/50 hover:bg-white hover:text-[#101827] transition-colors"
                    >
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#FF8A00]" />
                      <span>LinkedIn Profile</span>
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}