import { panCard } from "./pan-card";

export const services = [
  panCard,
];

export function getService(slug: string) {
  return services.find((item) => item.slug === slug);
}