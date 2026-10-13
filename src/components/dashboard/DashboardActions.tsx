"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarClock, ChevronDown, Plus, SquareCheckBig, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddContactShortcut from "./AddContactShortcut";

const shortcuts = [
  { label: "Add Automation", icon: Zap, href: "/dashboard/automations?add-automation=true" },
  { label: "Add Task", icon: SquareCheckBig, href: "/dashboard/tasks?add-task=true" },
  { label: "Add Question", icon: BookOpen, href: "/dashboard/questions?add-question=true" },
  { label: "Add Activity", icon: CalendarClock, href: "/dashboard/activities?add-activity=true" },
];

export default function DashboardActions() {
  const router = useRouter();
  const [contactOpen, setContactOpen] = useState(false);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" onClick={() => router.push("/dashboard/myjobs?add-job=true")}><Plus />Add Job</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="sm" variant="outline">More<ChevronDown /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {shortcuts.map(({ label, icon: Icon, href }) => <DropdownMenuItem key={href} onSelect={() => router.push(href)}><Icon className="mr-2 size-4" />{label}</DropdownMenuItem>)}
          <DropdownMenuItem onSelect={() => setContactOpen(true)}><Users className="mr-2 size-4" />Add Contact</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AddContactShortcut hideTrigger open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
