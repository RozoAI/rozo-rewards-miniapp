"use client";

import { RozoPayProvider } from "@rozoai/intent-pay";

interface RozoPayClientWrapperProps {
  children: React.ReactNode;
}

export function RozoPayClientWrapper({ children }: RozoPayClientWrapperProps) {
  return (
    <RozoPayProvider debugMode={true} apiVersion="v2">
      {children}
    </RozoPayProvider>
  );
}
