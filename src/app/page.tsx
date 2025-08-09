"use client";

import { PageHeader } from "@/components/page-header";
import { RestaurantsContent } from "@/components/restaurants/restaurants-content";
import { StoreIcon } from "lucide-react";

export default function Page() {
  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <PageHeader title="Lifestyle" icon={<StoreIcon className="size-6" />} />
      <RestaurantsContent />
    </div>
  );
}
