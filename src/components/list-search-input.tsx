"use client";

import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

type ListSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear: () => void;
  className?: string;
};

export function ListSearchInput({
  value,
  onChange,
  placeholder,
  onClear,
  className,
}: ListSearchInputProps) {
  return (
    <div className={cn("relative mb-4 px-4 sm:px-0", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent cursor-text"
          autoFocus={false}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
