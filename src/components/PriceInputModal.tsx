"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign } from "lucide-react";
import React, { useEffect, useState } from "react";

interface PriceInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
  title?: string;
  description?: string;
  defaultAmount?: string;
}

export function PriceInputModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Enter Payment Amount",
  description = "Please enter the amount you want to pay. Minimum amount is $0.10 USD.",
  defaultAmount = "",
}: PriceInputModalProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [error, setError] = useState("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow only numbers and decimal point
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError("");
    }
  };

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (numericAmount < 0.1) {
      setError("Amount must be at least $0.10 USD");
      return;
    }

    onConfirm(numericAmount);
    handleClose();
  };

  const handleClose = () => {
    setAmount(defaultAmount);
    setError("");
    onOpenChange(false);
  };

  // Reset amount to defaultAmount when modal opens
  useEffect(() => {
    if (open) {
      setAmount(defaultAmount);
      setError("");
    }
  }, [open, defaultAmount]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                onKeyPress={handleKeyPress}
                className="pl-10"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) < 0.1}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
