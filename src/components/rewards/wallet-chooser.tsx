"use client";

import { Ethereum, Solana, Stellar } from "@/components/chain-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React from "react";
import { WalletType } from "./lib";

const OPTIONS: { type: WalletType; label: string; icon: React.ReactNode }[] = [
  { type: "stellar", label: "Stellar", icon: <Stellar width={32} height={32} className="bg-transparent" /> },
  { type: "evm", label: "Ethereum", icon: <Ethereum width={32} height={32} className="rounded-full" /> },
  { type: "solana", label: "Solana", icon: <Solana width={32} height={32} /> },
];

export function WalletChooser({
  open,
  onChoose,
  onClose,
}: {
  open: boolean;
  onChoose: (type: WalletType) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Connect wallet</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {OPTIONS.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => onChoose(type)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 hover:bg-accent active:scale-95 transition-all"
            >
              {icon}
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
