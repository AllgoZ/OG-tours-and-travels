import type { StaticImageData } from "next/image";
import groupRoadTrip from "@/assets/images/blog-group-road-trip.jpg";
import urbaniaRental from "@/assets/images/blog-urbania-rental.jpg";
import familyChecklist from "@/assets/images/blog-family-checklist.jpg";
import weddingsEvents from "@/assets/images/blog-weddings-events.jpg";
import multiplePassengers from "@/assets/images/blog-multiple-passengers.jpg";

/**
 * Maps a post's `cover` frontmatter (a filename) to a statically-imported image so
 * next/image can optimise it. Add a line here when you add a new cover image.
 */
export const blogCovers: Record<string, StaticImageData> = {
  "blog-group-road-trip.jpg": groupRoadTrip,
  "blog-urbania-rental.jpg": urbaniaRental,
  "blog-family-checklist.jpg": familyChecklist,
  "blog-weddings-events.jpg": weddingsEvents,
  "blog-multiple-passengers.jpg": multiplePassengers,
};

export function coverImage(name: string): StaticImageData {
  return blogCovers[name] ?? groupRoadTrip;
}
