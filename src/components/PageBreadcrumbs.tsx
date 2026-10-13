"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { SIDEBAR_LINKS } from "@/lib/constants";

export default function PageBreadcrumbs() {
  const pathname = usePathname();
  const section = SIDEBAR_LINKS.find((item) => item.route !== "/dashboard" &&
    (pathname === item.route || pathname.startsWith(`${item.route}/`)));
  const label = pathname.startsWith("/dashboard/settings") ? "Settings" : section?.label;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      {label ? (
        <>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Home</Link>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate" aria-current="page">{label}</span>
        </>
      ) : <span aria-current="page">Home</span>}
    </nav>
  );
}
