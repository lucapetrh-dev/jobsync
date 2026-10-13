import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AppIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/images/jobs-icon.svg"
      alt="Jobs"
      width={64}
      height={64}
      className={cn("shrink-0", className)}
      unoptimized
    />
  );
}
