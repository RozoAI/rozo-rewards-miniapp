import { FabActions } from "@/components/fab-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discovery | Rozo",
  description: "Discover merchants and AI services for enhanced experiences",
  robots: { index: false, follow: false },
};

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full">
      {children}
      <FabActions className="fixed" />
    </div>
  );
}
