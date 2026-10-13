import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AppIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/images/jobs-icon.png"
      alt="Jobs"
      width={64}
      height={64}
      className={cn("shrink-0 rounded-lg", className)}
      unoptimized
    />
  );
}
