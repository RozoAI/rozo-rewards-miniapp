function withValidProperties(
  properties: Record<string, undefined | string | string[]>
) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return !!value;
    })
  );
}

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL;

  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    frame: withValidProperties({
      version: "1",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [
        "https://github.com/user-attachments/assets/e66d2bb1-8dcb-40bd-a812-6e7e310f4f8d",
        "https://github.com/user-attachments/assets/9f21188b-196a-4b71-a8f5-87a05e553676",
        "https://github.com/user-attachments/assets/a3f333e9-b2d0-4337-b32a-957d275e87a3",
      ],
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      webhookUrl: `${URL}api/webhook`,
      primaryCategory: process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: ["rozo", "rewards", "cashback", "restaurant", "lifestyle"],
      heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      buttonTitle: "Buy and Earn Rewards",
    }),
    miniapp: {
      version: "1",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      iconUrl: process.env.NEXT_PUBLIC_APP_ICON,
      homeUrl: URL,
      imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      buttonTitle: "Buy and Earn Rewards",
      splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
      splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      webhookUrl: `${URL}api/webhook`,
    },
    baseBuilder: {
      allowedAddress: process.env.ALLOWED_BASE_ADDRESS,
      allowedAddresses: ["0x596215a85AF60197C111A2b002cE68253fb0B7f4"],
    },
  });
}
