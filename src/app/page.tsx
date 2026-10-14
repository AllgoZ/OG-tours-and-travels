import { HeroSection } from "@/components/sections/HeroSection";
import { ValueStrip } from "@/components/sections/ValueStrip";
import { VehicleShowcase } from "@/components/sections/VehicleShowcase";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { BenefitsSection } from "@/components/sections/BenefitsSection";
import { GoogleReviews } from "@/components/sections/GoogleReviews";
import { BookingSteps } from "@/components/sections/BookingSteps";
import { DestinationsSection } from "@/components/sections/DestinationsSection";
import { LatestStories } from "@/components/sections/LatestStories";
import { FAQSection } from "@/components/sections/FAQSection";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <HeroSection />
      <ValueStrip />
      <VehicleShowcase />
      <ServicesSection />
      <BenefitsSection />
      <GoogleReviews />
      <BookingSteps />
      <DestinationsSection />
      <LatestStories />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
