"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";

export function RozoOgNotice() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          ROZO OG <ArrowRight className="size-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ROZO OG</DialogTitle>
          <DialogDescription className="leading-relaxed">
            🎉 Cashback rewards are coming in July 2026.
            <br />
            Thanks for being an early supporter.
          </DialogDescription>
        </DialogHeader>

        <Button asChild className="w-full">
          <a
            href="https://og.rozo.ai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            View balance at Legacy page
            <ArrowRight className="size-4" />
          </a>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
