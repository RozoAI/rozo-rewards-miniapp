"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function BookmarkRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ai-services");
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
