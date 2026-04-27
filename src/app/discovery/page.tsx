"use client";

import { DappContent } from "@/components/dapp/dapp-content";
import { Binoculars } from "lucide-react";

export default function DappPage() {
  return (
    <DappContent title="Discovery" icon={<Binoculars className="size-6" />} />
  );
}
