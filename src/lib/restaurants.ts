import type { Restaurant } from "@/types/restaurant";
import { LOCATIONS } from "./data";

// Hidden merchants are excluded everywhere: lists and direct /ns/[handle]
// lookups (direct visits then fall into the offline-notice redirect).
const locations = (LOCATIONS as unknown as Restaurant[]).filter(
  (l) => !l.hidden,
);

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
