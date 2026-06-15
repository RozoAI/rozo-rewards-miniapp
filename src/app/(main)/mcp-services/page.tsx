import { ComingSoon } from "@/components/coming-soon";
import { createMiniAppMetadata, embedConfigs } from "@/lib/miniapp-embed";
import { Metadata } from "next";

export const metadata: Metadata = createMiniAppMetadata(
  {
    ...embedConfigs.mcpServices,
    url: `${process.env.NEXT_PUBLIC_URL}/mcp-services`,
  },
  {
    title: "MCP Services | Rozo",
    description: "Model Context Protocol services and integrations",
    robots: {
      index: false,
      follow: false,
    },
  }
);

export default function McpServicesPage() {
  return <ComingSoon />;
}
