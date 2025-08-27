"use client";

import { cn } from "@/lib/utils";
import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { WalletComponents } from "./wallet-connect-button";

export function PageHeader({
  title,
  icon,
  isBackButton,
}: {
  title: string;
  icon?: React.ReactNode;
  isBackButton?: boolean;
}) {
  const router = useRouter();
  const { isInMiniApp, isPending } = useIsInMiniApp();

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 sm:px-0",
        isBackButton && "pl-0"
      )}
    >
      <div className="flex items-center gap-2">
        {isBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        {icon}
        <h1 className="text-lg sm:text-2xl font-bold">{title}</h1>
      </div>
      {!isPending && <WalletComponents />}
    </div>
  );
}
