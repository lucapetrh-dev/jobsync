import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AppIcon({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Jobs" className={cn("inline-flex shrink-0", className)}>
      <Image
        src="/images/jobs-logo-light.png"
        alt=""
        width={256}
        height={256}
        className="size-full object-contain dark:hidden"
        unoptimized
      />
      <Image
        src="/images/jobs-logo-dark.png"
        alt=""
        width={256}
        height={256}
        className="hidden size-full object-contain dark:block"
        unoptimized
      />
    </span>
  );
}
