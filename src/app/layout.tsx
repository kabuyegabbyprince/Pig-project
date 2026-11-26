import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Rwanda Pig Project & Revolving Fund",
  description: "Comprehensive livestock management, beneficiary tracking, and revolving fund system for the Pig Project in Rwanda.",
  icons: {
    icon: [
      { url: "/pplog-.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: "/pplog-.png",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/pplog-.png", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/pplog-.png" />
        <link rel="shortcut icon" type="image/png" href="/pplog-.png" />
        <link rel="apple-touch-icon" href="/pplog-.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.location.hash === "#impact" || window.location.hash === "#/impact") {
                  if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, "", window.location.pathname || "/");
                  }
                  window.scrollTo({ top: 0, behavior: "instant" });
                }
                var theme = localStorage.getItem("pp_pref_theme") || "light";
                var size = localStorage.getItem("pp_pref_text_size") || "default";
                document.documentElement.setAttribute("data-theme", theme);
                document.documentElement.setAttribute("data-text-size", size);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen overflow-x-clip font-sans antialiased bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
