import { FabActions } from "@/components/fab-actions";

export default function AiServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      <FabActions className="fixed" />
    </div>
  );
}
