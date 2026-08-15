export interface GovernmentService {
  id: number;
  title: string;
  description: string;
  icon: string;
  href: string;
  category:
    | "Identity"
    | "Certificate"
    | "Transport"
    | "Health"
    | "Education"
    | "CSC";

  popular?: boolean;
}