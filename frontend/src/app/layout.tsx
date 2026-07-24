import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
import { APP_BRAND, buildAppUrl, withBrand } from "@/config/app-brand";
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
  manifest: buildAppUrl("/manifest.webmanifest"),
  icons: {
    icon: "/favicon.ico"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
