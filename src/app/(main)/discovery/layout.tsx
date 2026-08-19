import { FabActions } from "@/components/fab-actions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discovery | Rozo",
  description: "Discover merchants and AI services for enhanced experiences",
  // Self-referencing canonical, matching the other indexable surfaces
  // (/ns, /ns/[handle], /ai-services/[domain]). These two index pages were the
  // only sitemap-listed URLs shipping without one.
  alternates: { canonical: "/discovery" },
};

export default function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full">
      {children}
      <FabActions className="fixed" />
    </div>
  );
}
