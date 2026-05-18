import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
  title: "Bellory | Tecnologia elegante para profissionais da beleza",
  description:
    "Automatize seu salão, organize sua agenda e fidelize clientes com CRM, WhatsApp, campanhas e inteligência.",
  keywords: [
    "Bellory",
    "SaaS beleza",
    "agenda online",
    "salão de beleza",
    "WhatsApp para salão",
    "CRM beleza"
  ],
  openGraph: {
    title: "Bellory | Tecnologia elegante para profissionais da beleza",
    description:
      "Automatize seu salão e fidelize clientes com uma plataforma leve, moderna e inteligente.",
    type: "website",
    locale: "pt_BR",
    siteName: "Bellory"
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
        {children}
      </body>
    </html>
  );
}
