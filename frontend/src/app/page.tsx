import { SiteFooter } from "@/layouts/site-footer";
import { SiteHeader } from "@/layouts/site-header";
import { BenefitsSection } from "@/sections/benefits-section";
import { DashboardPreviewSection } from "@/sections/dashboard-preview-section";
import { FinalCtaSection } from "@/sections/final-cta-section";
import { HeroSection } from "@/sections/hero-section";
import { HowItWorksSection } from "@/sections/how-it-works-section";
import { PlansSection } from "@/sections/plans-section";
import { TestimonialsSection } from "@/sections/testimonials-section";
import { WhatsAppSection } from "@/sections/whatsapp-section";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <BenefitsSection />
        <HowItWorksSection />
        <WhatsAppSection />
        <DashboardPreviewSection />
        <PlansSection />
        <TestimonialsSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
