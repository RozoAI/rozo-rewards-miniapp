"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getFirstTwoWordInitialsFromName } from "@/lib/utils";
import { ExternalLink, Globe } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DappItem {
  id: string;
  name: string;
  domain: string;
  description: string;
  logo_url: string;
}

export default function DappPage() {
  const [dapps, setDapps] = useState<DappItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDapps() {
      try {
        const res = await fetch("/dapp.json");
        if (!res.ok) throw new Error("Failed to fetch dapp.json");
        const data = await res.json();
        setDapps(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDapps();
  }, []);

  if (error) {
    return (
      <div className="w-full mb-16 flex flex-col gap-4 mt-4">
        <PageHeader title="DApps" icon={<Globe className="size-6" />} />
        <div className="p-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <PageHeader title="DApps" icon={<Globe className="size-6" />} />

      {loading ? (
        <div className="px-4 sm:px-0">
          <ul className="divide-y rounded-md border">
            {Array.from({ length: 3 }).map((_, idx) => (
              <li key={idx} className="flex items-start gap-3 px-4 py-4">
                <div className="size-12 rounded-lg bg-muted animate-pulse ring-1 ring-border flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 max-w-48 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full max-w-64 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 max-w-32 rounded bg-muted animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 sm:px-0">
          <ul className="divide-y rounded-md border bg-card">
            {dapps.map((dapp) => {
              const initials = getFirstTwoWordInitialsFromName(dapp.name);
              return (
                <li key={dapp.id}>
                  <Link
                    href={dapp.domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-start gap-3 px-4 py-4",
                      "hover:bg-muted/50 transition-colors",
                      "active:bg-muted"
                    )}
                  >
                    <Avatar className="size-12 rounded-lg ring-1 ring-border bg-muted flex-shrink-0">
                      <AvatarImage src={dapp.logo_url} alt={dapp.name} />
                      <AvatarFallback className="rounded-lg font-medium text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {dapp.name}
                        </h3>
                        <ExternalLink className="size-3.5 text-muted-foreground flex-shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {dapp.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                        {dapp.domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {dapps.length === 0 && (
            <div className="text-center py-8 px-4">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No DApps found
              </h3>
              <p className="text-muted-foreground">
                Check back later for new DApps.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
