import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/70 py-14 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2 space-y-3">
            <Link
              href="/"
              aria-label="Pig Project Rwanda home"
              className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-xs border border-slate-200/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pplog-.png"
                alt="Pig Project Rwanda Logo"
                className="h-11 w-auto object-contain"
              />
            </Link>
            <p className="text-sm font-semibold text-slate-900">
              One Piglet. One Family. A Fund That Keeps Moving.
            </p>
            <p className="text-xs leading-relaxed text-slate-500 max-w-md">
              A sustainable revolving fund supporting vulnerable rural families across Rwanda
              with livestock capital and veterinary backing.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/#about" className="hover:text-slate-900 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#impact" className="hover:text-slate-900 transition-colors">
                  Impact Summary
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-slate-900 transition-colors">
                  Field Gallery
                </Link>
              </li>
              <li>
                <Link href="/team" className="hover:text-slate-900 transition-colors">
                  Our Team
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Operations
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/login" prefetch={false} className="hover:text-slate-900 transition-colors">
                  Staff Login
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-slate-900 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Value Protocols, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Pig Project Rwanda &bull; Value Protocols. All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
