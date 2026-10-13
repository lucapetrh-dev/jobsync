import Link from "next/link";
import AppIcon from "./AppIcon";
import { PanelLeft, Settings } from "lucide-react";

import { Button } from "./ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SIDEBAR_LINKS } from "@/lib/constants";
import SidebarToggle from "./SidebarToggle";
import { AgentChatTrigger } from "./AgentChatTrigger";
import PageBreadcrumbs from "./PageBreadcrumbs";

async function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background px-4 md:px-6 lg:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <nav className="grid gap-2 text-sm font-medium">
            <SheetClose asChild>
              <Link
                href="/dashboard"
                aria-label="Jobs home"
                className="mb-4 flex items-center gap-3 px-2.5 text-base font-semibold"
              >
                <AppIcon className="h-8 w-8" />
                <span>Jobs</span>
              </Link>
            </SheetClose>
            {SIDEBAR_LINKS.map((item) => {
              // Only show dev-only items in development mode
              if (item.devOnly && process.env.NODE_ENV !== "development") {
                return null;
              }
              return (
                <SheetClose asChild key={item.label}>
                  <Link
                    href={item.route}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </SheetClose>
              );
            })}
            <SheetClose asChild>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
      <SidebarToggle />
      <PageBreadcrumbs />
      <div className="ml-auto"><AgentChatTrigger /></div>
    </header>
  );
}

export default Header;
