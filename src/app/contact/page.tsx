import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, MessageCircle, Phone, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const contactMethods = [
  {
    icon: Mail,
    label: "Official Email",
    value: "pigprojectfund@gmail.com",
    href: "mailto:pigprojectfund@gmail.com",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp Support",
    value: "0723 729 454",
    href: "https://wa.me/250723729454",
  },
  {
    icon: Phone,
    label: "Telephone Line",
    value: "0781 219 911",
    href: "tel:+250781219911",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] px-4 py-8 text-[#101827] sm:py-16 antialiased">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="grid gap-0 lg:grid-cols-12">
          {/* Left panel */}
          <div className="bg-[#101827] p-8 text-white sm:p-10 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF8A00] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to website</span>
                </Link>
                <Link href="/" className="inline-flex items-center rounded-xl bg-white px-2.5 py-1 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pplog-.png" alt="Pig Project Rwanda" className="h-8 w-auto object-contain" />
                </Link>
              </div>

              <h1 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Get in touch with our team
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Whether you want to learn more about the Pig Project, support community revolving funds, or collaborate with our field staff, we are here to help.
              </p>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FF8A00]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Response Time</span>
                </div>
                <p className="mt-1 text-base font-bold text-white">Usually within 24 hours</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-3">
              <a
                href="mailto:pigprojectfund@gmail.com"
                className="inline-flex items-center gap-2 rounded-full bg-[#FF8A00] px-5 py-2.5 text-xs font-bold text-[#101827] hover:bg-[#e07900] transition-colors shadow-xs"
              >
                <span>Email Us Directly</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Right panel */}
          <div className="p-8 sm:p-10 lg:col-span-7 bg-white">
            <h2 className="text-xl font-bold tracking-tight text-[#101827] mb-6">
              Contact Channels
            </h2>

            <div className="space-y-3">
              {contactMethods.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noreferrer" : undefined}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[#F5F5F5]/70 p-4 transition-all hover:bg-white hover:border-[#FF8A00]/50 hover:shadow-xs"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF8A00]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                      <div className="text-sm font-bold text-[#101827] sm:text-base break-all">{value}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-400 group-hover:text-[#FF8A00] transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </a>
              ))}
            </div>

            <form className="mt-8 space-y-4 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-[#101827]">Send an inquiry</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827] outline-none transition focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20"
                    placeholder="Jean Paul"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827] outline-none transition focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20"
                    placeholder="jp@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-[#101827] outline-none transition focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20"
                  placeholder="How can we assist you or collaborate?"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#101827] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f2937] transition-colors shadow-xs cursor-pointer"
              >
                <span>Send Message</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#FF8A00]" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
