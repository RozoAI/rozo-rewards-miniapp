import coffeeData from "@/../public/coffee_mapdata.json";
import { GoogleMap } from "@/components/home/google-map";
import { MapPin } from "@/components/map-pin";
import { RestaurantsContent } from "@/components/restaurants/restaurants-content";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronUp } from "lucide-react";
import { FabActions } from "../fab-actions";
import { WalletComponents } from "../wallet-connect-button";

type Restaurant = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2: string;
  lat: number;
  lon: number;
  logo_url: string;
  cashback_rate: number;
};

export default function HomePage() {
  const restaurants: Restaurant[] = coffeeData.locations;

  // Center map around first restaurant or default location
  const defaultCenter =
    restaurants.length > 0
      ? { lat: restaurants[0].lat, lng: restaurants[0].lon }
      : { lat: 37.7749, lng: -122.4194 }; // San Francisco default

  return (
    <div className="relative h-screen w-full">
      {/* Full screen map */}
      <GoogleMap defaultCenter={defaultCenter} restaurants={restaurants} />

      {/* Trigger card above bottom navbar */}
      <div className="absolute bottom-16 left-0 right-0 px-4 pb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Card className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 rounded-t-2xl rounded-b-lg bg-card shadow-lg py-0 w-[calc(100%-84px)]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {restaurants.length} restaurants nearby
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tap to view restaurants
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[85vh] rounded-t-3xl border-t-2 p-0"
          >
            <div className="flex flex-col h-full">
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
              </div>

              <SheetHeader className="px-4 pb-2">
                <SheetTitle className="flex items-center justify-between gap-2">
                  <h1 className="text-xl">Restaurants Near You</h1>
                  <WalletComponents />
                </SheetTitle>
                <p className="text-sm text-gray-500 text-left">
                  {restaurants.length} places found
                </p>
              </SheetHeader>

              <ScrollArea className="flex-1 py-3 h-[calc(100%-100px)] px-4">
                <RestaurantsContent />
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <FabActions className="absolute" />

      <div className="absolute top-4 left-4">
        <WalletComponents />
      </div>
    </div>
  );
}
