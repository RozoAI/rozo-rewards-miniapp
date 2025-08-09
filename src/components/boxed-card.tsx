import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function BoxedCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	// Base classes
	const baseClasses = [
		"border-0",
		"flex",
		"flex-col",
		"overflow-auto",
		"rounded-none",
		"shadow-none",
		"w-full",
	];

	// Medium screen classes
	const mdClasses = [
		"md:border",
		"md:flex-none",
		"md:h-full",
		"md:min-h-[400px]",
		"md:max-w-[500px]",
		"md:rounded-lg",
		"md:shadow-md",
		"md:w-[500px]",
	];

	return (
		<Card
			className={cn(
				baseClasses.join(" "),
				mdClasses.join(" "),
				className ?? "",
			)}
		>
			{children}
		</Card>
	);
}
