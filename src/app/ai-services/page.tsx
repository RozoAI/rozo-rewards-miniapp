import { AiServicesContent } from "@/components/ai-services/ai-services-content";
import { PageHeader } from "@/components/page-header";
import { SparkleIcon } from "lucide-react";

export default function AiServicesPage() {
  return (
    <div className="w-full mb-16 flex flex-col gap-4 mt-4">
      <PageHeader
        title="AI Services"
        icon={<SparkleIcon className="size-6" />}
      />
      <AiServicesContent />
    </div>
  );
}
