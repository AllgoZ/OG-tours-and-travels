import { HeroSection } from "@/components/sections/HeroSection";
import { VehicleShowcase } from "@/components/sections/VehicleShowcase";
import { ServicesSection } from "@/components/sections/ServicesSection";
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
      <VehicleShowcase />
      <ServicesSection />
      <GoogleReviews />
      <BookingSteps />
      <DestinationsSection />
      <LatestStories />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
