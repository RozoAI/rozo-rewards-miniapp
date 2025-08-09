import { createMiniAppMetadata, embedConfigs } from "@/lib/miniapp-embed";
import { Metadata } from "next";
import ProfilePageContent from "./profile-content";

export const metadata: Metadata = createMiniAppMetadata(
  {
    ...embedConfigs.profile,
    url: `${process.env.NEXT_PUBLIC_URL}/profile`,
  },
  {
    title: "Profile | Rozo Rewards",
    description:
      "View your rewards, activity, and manage your wallet connection",
    robots: {
      index: false,
      follow: false,
    },
  }
);

export default function ProfilePage() {
  return <ProfilePageContent />;
}
