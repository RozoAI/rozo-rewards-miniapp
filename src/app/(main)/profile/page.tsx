"use client";
import { useSearchParams } from "next/navigation";
import ProfilePageContent from "./profile-content";

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const beta = searchParams.get("beta");
  return <ProfilePageContent isBeta={beta === "true"} />;
}
