import type { Restaurant } from "@/types/restaurant";
import data from "../../public/coffee_mapdata.json";

const locations = data.locations as unknown as Restaurant[];

export function getRestaurantById(id: string): Restaurant | null {
  return locations.find((l) => l._id === id) ?? null;
}

export function getAllRestaurants(): Restaurant[] {
  return locations;
}
