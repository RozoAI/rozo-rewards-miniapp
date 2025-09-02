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

// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in miles
  return distance;
}

// Format distance for display
export function formatDistance(distanceMiles: number): string {
  if (distanceMiles < 0.1) {
    return `${Math.round(distanceMiles * 5280)}ft`;
  } else if (distanceMiles < 1) {
    return `${distanceMiles.toFixed(1)}mi`;
  } else if (distanceMiles < 10) {
    return `${distanceMiles.toFixed(1)}mi`;
  } else {
    return `${Math.round(distanceMiles)}mi`;
  }
}

// Currency conversion utilities
export const EXCHANGE_RATES: Record<string, number> = {
  RM: 4.2,
  SGD: 1.29,
  USD: 1.0,
};

export function convertToUSD(
  amountLocal: string,
  currencyLocal: string
): string {
  const numAmount = parseFloat(amountLocal);
  if (isNaN(numAmount)) return "0.00";

  const rate = EXCHANGE_RATES[currencyLocal] || 1.0; // Default to USD
  return (numAmount / rate).toFixed(2);
}

export function getDisplayCurrency(currency?: string): string {
  return currency || "USD";
}
