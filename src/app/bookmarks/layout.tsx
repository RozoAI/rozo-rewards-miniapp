import { FabActions } from "@/components/fab-actions";

export default function BookmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FabActions className="fixed" />
    </>
  );
}
