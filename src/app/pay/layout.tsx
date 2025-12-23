import { FabActions } from "@/components/fab-actions";
import { RozoPayClientWrapper } from "@/components/RozoPayClientWrapper";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <RozoPayClientWrapper>
      <div className="relative w-full">
        {children}
        <FabActions className="fixed" />
      </div>
    </RozoPayClientWrapper>
  );
}
