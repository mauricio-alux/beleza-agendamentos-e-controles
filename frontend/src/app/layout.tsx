import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
import { APP_BRAND, withBrand } from "@/config/app-brand";
import { PwaDiagnosticObserver } from "@/components/pwa/PwaDiagnosticObserver";
import { PwaServiceWorker } from "@/components/pwa/PwaServiceWorker";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallProvider";
import { PWA_THEME_COLOR } from "@/lib/pwa-manifest";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_BRAND.appUrl),
  applicationName: APP_BRAND.appName,
  title: {
    default: withBrand("Tecnologia elegante para profissionais da beleza"),
    template: `%s | ${APP_BRAND.appName}`
  },
  description:
    "Automatize seu salão, organize sua agenda e fidelize clientes com CRM, WhatsApp, campanhas e inteligência.",
  keywords: [
    APP_BRAND.appName,
    "SaaS beleza",
    "agenda online",
    "salão de beleza",
    "WhatsApp para salão",
    "CRM beleza"
  ],
  openGraph: {
    title: withBrand("Tecnologia elegante para profissionais da beleza"),
    description:
      "Automatize seu salão e fidelize clientes com uma plataforma leve, moderna e inteligente.",
    type: "website",
    locale: "pt_BR",
    siteName: APP_BRAND.appName,
    url: APP_BRAND.appUrl
  },
  alternates: {
    canonical: APP_BRAND.appUrl
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/pwa-icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/icons/pwa-icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: APP_BRAND.appName,
    statusBarStyle: "default"
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.webmanifest"
          crossOrigin={process.env.DEV_PWA_MANIFEST_CREDENTIALS === "true" ? "use-credentials" : undefined} />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <PwaInstallProvider><AuthProvider>{children}</AuthProvider></PwaInstallProvider>
        <PwaServiceWorker />
        <PwaDiagnosticObserver />
      </body>
    </html>
  );
}
