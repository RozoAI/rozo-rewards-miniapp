// "use client";

// import { AiServicesContent } from "@/components/ai-services/ai-services-content";
// import { PageHeader } from "@/components/page-header";
// import { useIsInMiniApp } from "@coinbase/onchainkit/minikit";
// import { Binoculars } from "lucide-react";
// import { useEffect } from "react";
// import { base } from "viem/chains";
// import { useConnect } from "wagmi";
// import { injected } from "wagmi/connectors";
// import data from "../../../public/ai_commerce_catalog.json";

// export default function AiServicesPage() {
//   const { isInMiniApp } = useIsInMiniApp();
//   const { connect } = useConnect();

//   useEffect(() => {
//     if (isInMiniApp) {
//       connect({ connector: injected(), chainId: base.id });
//     }
//   }, [isInMiniApp, connect]);

//   return (
//     <div className="w-full mb-16 flex flex-col gap-4 mt-4">
//       <PageHeader title="Discovery" icon={<Binoculars className="size-6" />} />
//       <AiServicesContent data={data} />
//     </div>
//   );
// }

"use client";

import { DappContent } from "@/components/dapp/dapp-content";
import { Binoculars } from "lucide-react";

export default function DappPage() {
  return (
    <DappContent title="Discovery" icon={<Binoculars className="size-6" />} />
  );
}
