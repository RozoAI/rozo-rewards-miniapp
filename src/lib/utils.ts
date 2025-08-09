import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstTwoWordInitialsFromName(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const firstTwo = words.slice(0, 2);
  if (firstTwo.length === 0) return "?";
  if (firstTwo.length === 1) return firstTwo[0].charAt(0).toUpperCase();
  return (
    firstTwo[0].charAt(0).toUpperCase() + firstTwo[1].charAt(0).toUpperCase()
  );
}

export function formatAddress(address: string | null | undefined) {
  if (!address) return "No address";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
