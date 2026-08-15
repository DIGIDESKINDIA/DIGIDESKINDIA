import { ServiceDetail } from "./types";

export const panCard: ServiceDetail = {
  slug: "pan-card",

  title: "PAN Card",

  shortDescription:
    "Apply for a new PAN Card or correction online.",

  overview:
    "Permanent Account Number (PAN) is issued by the Income Tax Department of India and is required for taxation and financial transactions.",

  documents: [
    "Aadhaar Card",
    "Passport Size Photo",
    "Mobile Number",
    "Email Address",
  ],

  eligibility: [
    "Indian Citizen",
    "Minimum Age 18+",
  ],

  process: [
    "Fill Online Form",
    "Upload Documents",
    "Pay Fee",
    "Verification",
    "PAN Issued",
  ],

  fee: "₹107",

  processingTime: "7-15 Days",

  related: [
    "aadhaar",
    "voter-id",
  ],
};