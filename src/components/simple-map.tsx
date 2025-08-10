"use client";

import React from "react";
import { Coins } from "lucide-react";

type LocationItem = {
  _id: string;
  name: string;
  formatted: string;
  address_line1: string;
  address_line2?: string;
  lat: number;
  lon: number;
  distance?: number;
  logo_url: string;
  cashback_rate: number;
};

interface SimpleMapProps {
  center: [number, number];
  locations: LocationItem[];
}

export function SimpleMap({ center, locations }: SimpleMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!mapRef.current) return;

    let map: any = null;
    let userMarker: any = null;
    let merchantMarkers: any[] = [];

    async function initializeMap() {
      try {
        // Import leaflet
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        // Fix default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        // Create map
        map = L.map(mapRef.current!).setView(center, 13);

        // Add tile layer (OpenStreetMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // User location marker (blue dot)
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        userMarker = L.marker(center, { icon: userIcon })
          .addTo(map)
          .bindPopup('<strong>Your Location</strong>');

        // Crypto merchant markers
        const baseIcon = L.divIcon({
          className: 'base-merchant-marker',
          html: '<div style="background-color: #0052ff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 10px; font-weight: bold;">B</span></div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        // Add merchant markers
        locations.forEach((location) => {
          const marker = L.marker([location.lat, location.lon], { icon: baseIcon })
            .addTo(map)
            .bindPopup(`
              <div style="text-align: center; min-width: 150px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-bottom: 8px;">
                  <span style="color: #0052ff; font-size: 12px; font-weight: 600;">⚡ Accepts Base</span>
                </div>
                <strong style="display: block; font-size: 14px; margin-bottom: 4px;">${location.name}</strong>
                <p style="font-size: 11px; color: #666; line-height: 1.3; margin-bottom: 4px;">${location.address_line1}</p>
                ${location.address_line2 ? `<p style="font-size: 11px; color: #666; line-height: 1.3; margin-bottom: 8px;">${location.address_line2}</p>` : ''}
                <p style="font-size: 11px; font-weight: 600; color: #2563eb; margin-bottom: 8px;">${location.distance?.toFixed(1)} miles away</p>
                <a href="/restaurant/${location._id}" style="display: inline-block; padding: 4px 8px; background-color: #0052ff; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; font-weight: 600;">Pay with Base</a>
              </div>
            `);
          
          merchantMarkers.push(marker);
        });

        setMapLoaded(true);
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    }

    initializeMap();

    // Cleanup
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [center, locations]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: "500px", 
        width: "100%", 
        backgroundColor: mapLoaded ? "transparent" : "#f3f4f6",
        borderRadius: "8px"
      }} 
      className="relative"
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm">Loading map...</span>
          </div>
        </div>
      )}
    </div>
  );
} 