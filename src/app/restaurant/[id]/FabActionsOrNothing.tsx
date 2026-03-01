"use client";

import { FabActions } from "@/components/fab-actions";
import { useSearchParams } from "next/navigation";

export function FabActionsOrNothing() {
  const searchParams = useSearchParams();
  if (searchParams.get("dapp") === "true") return null;
  return <FabActions className="fixed" />;
}
