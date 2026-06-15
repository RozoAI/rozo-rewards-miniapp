import type { Restaurant } from "@/types/restaurant";
import { LOCATIONS } from "./data";

const locations = LOCATIONS as unknown as Restaurant[];

const locationsById = new Map(locations.map((l) => [l._id, l]));

export function getRestaurantById(id: string): Restaurant | null {
  return locationsById.get(id) ?? null;
}

export function getAllRestaurants(): Restaurant[] {
  return locations;
}
