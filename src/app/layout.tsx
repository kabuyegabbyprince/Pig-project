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
      { url: "/icon.png?v=3", sizes: "256x256", type: "image/png" },
      { url: "/favicon.ico?v=3", type: "image/x-icon" },
      { url: "/pplog-.png?v=3", type: "image/png" },
    ],
    shortcut: "/icon.png?v=3",
    apple: [
      { url: "/apple-icon.png?v=3", sizes: "180x180", type: "image/png" },
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
