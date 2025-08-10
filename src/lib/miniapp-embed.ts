import type { Metadata } from "next";

export interface MiniAppEmbedConfig {
  version?: string;
  imageUrl: string;
  buttonTitle: string;
  actionType?: "launch_frame" | "view_token";
  name?: string;
  url?: string;
  splashImageUrl?: string;
  splashBackgroundColor?: string;
}

export function generateMiniAppEmbed(config: MiniAppEmbedConfig): string {
  const embed = {
    version: config.version || "1",
    imageUrl: config.imageUrl,
    button: {
      title: config.buttonTitle,
      action: {
        type: config.actionType || "launch_frame",
        name:
          config.name ||
          process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ||
          "Rozo Rewards",
        url: config.url || process.env.NEXT_PUBLIC_URL,
        splashImageUrl:
          config.splashImageUrl || process.env.NEXT_PUBLIC_SPLASH_IMAGE,
        splashBackgroundColor:
          config.splashBackgroundColor ||
          process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR ||
          "#f5f0ec",
      },
    },
  };

  return JSON.stringify(embed);
}

export function createMiniAppMetadata(
  config: MiniAppEmbedConfig,
  additionalMetadata: Partial<Metadata> = {}
): Metadata {
  const embedJson = generateMiniAppEmbed(config);

  const otherMetadata: Record<string, string | number | (string | number)[]> = {
    "fc:miniapp": embedJson,
    "fc:frame": embedJson, // For backward compatibility
  };

  // Add any existing other metadata, filtering out undefined values
  if (additionalMetadata.other) {
    Object.entries(additionalMetadata.other).forEach(([key, value]) => {
      if (value !== undefined) {
        otherMetadata[key] = value;
      }
    });
  }

  return {
    ...additionalMetadata,
    other: otherMetadata,
  };
}

// Common embed configurations for different page types
export const embedConfigs = {
  home: {
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    buttonTitle: "🚀 Explore Lifestyle",
    name: "Rozo Rewards",
  },
  restaurants: {
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    buttonTitle: "🍽️ Browse Lifestyle",
    name: "Restaurant Directory",
  },
  aiServices: {
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    buttonTitle: "✨ AI Services",
    name: "AI Services",
  },
  profile: {
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    buttonTitle: "👤 View Profile",
    name: "User Profile",
  },
  mcpServices: {
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || "/logo.png",
    buttonTitle: "🔧 MCP Services",
    name: "MCP Services",
  },
} as const;
