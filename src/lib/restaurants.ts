import type { Restaurant } from "@/types/restaurant";
import { LOCATIONS } from "./data";

const locations = LOCATIONS as unknown as Restaurant[];

const locationsById = new Map(locations.map((l) => [l._id, l]));
const locationsByHandle = new Map(locations.map((l) => [l.handle, l]));

export function getRestaurantById(id: string): Restaurant | null {
  return locationsById.get(id) ?? null;
}

export function getRestaurantByHandle(handle: string): Restaurant | null {
  return locationsByHandle.get(handle) ?? null;
}

export function getAllRestaurants(): Restaurant[] {
  return locations;
}
