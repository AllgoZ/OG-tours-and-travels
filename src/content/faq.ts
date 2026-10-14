/**
 * Conservative FAQ copy. No fixed policies, cancellation terms, advance-payment rules or
 * guarantees are stated: pricing and availability are always confirmed directly.
 * Edit here once the owner confirms real policies.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const faqs: FaqItem[] = [
  {
    question: "How can I enquire about a booking?",
    answer:
      "Use the Enquire on WhatsApp button, or call us. You can also fill in the trip form on this page; it prepares a WhatsApp message with your details for you to review and send.",
  },
  {
    question: "What information should I provide when requesting a quote?",
    answer:
      "Your pickup location, destination, travel date, number of passengers and roughly how long you need the vehicle. If you have extra stops, luggage or special requirements, mention them too.",
  },
  {
    question: "Can I enquire about outstation trips?",
    answer:
      "Yes. Outstation trips are one of the services you can ask about. Share your destination and dates, and we'll confirm the details with you directly.",
  },
  {
    question: "How do I confirm vehicle availability?",
    answer:
      "Availability depends on your travel dates and trip details. This website does not show live availability, so send us your trip details and we'll confirm directly.",
  },
  {
    question: "How is the rental price calculated?",
    answer:
      "The price depends on your trip details, for example the route, travel dates and duration. We share a quotation once we have your details, and the final price is confirmed with you directly.",
  },
  {
    question: "Can I request transportation for an event?",
    answer:
      "Yes. You can enquire about transport for functions, celebrations and corporate events. Tell us the date, timings, locations and number of passengers.",
  },
];
