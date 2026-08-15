export interface GovernmentService {
  id: number;
  slug: string;
  title: string;
  category: string;
  description: string;
  icon: string;

  processingTime: string;

  governmentFee: string;
  serviceCharge: string;

  documents: string[];

  eligibility: string[];

  benefits: string[];

  faq: {
    question: string;
    answer: string;
  }[];
}

export const governmentServices: GovernmentService[] = [
  {
    id: 1,

    slug: "pan-card",

    title: "PAN Card",

    category: "Identity",

    description:
      "Apply for a new PAN Card, correction or reprint online.",

    icon: "🪪",

    processingTime: "7–15 Working Days",

    governmentFee: "₹107",

    serviceCharge: "₹50",

    documents: [
      "Aadhaar Card",
      "Passport Size Photo",
      "Identity Proof",
      "Address Proof",
    ],

    eligibility: [
      "Indian Citizen",
      "Valid Mobile Number",
    ],

    benefits: [
      "Income Tax Filing",
      "Bank Account Opening",
      "Financial Transactions",
    ],

    faq: [
      {
        question: "Who can apply for PAN Card?",
        answer:
          "Any Indian citizen or eligible entity can apply.",
      },
      {
        question: "How many days does it take?",
        answer:
          "Usually 7–15 working days.",
      },
    ],
  },
];