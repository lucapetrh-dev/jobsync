"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddContact from "@/components/AddContact";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobLocations } from "@/actions/jobLocation.actions";
import { getAllContactRoles } from "@/actions/contactRole.actions";
import type { ContactRole } from "@/models/contact.model";
import type { Company, JobLocation } from "@/models/job.model";

export default function AddContactShortcut({ hideTrigger = false, open, onOpenChange }: {
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<JobLocation[]>([]);
  const [roles, setRoles] = useState<ContactRole[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);
  const pickersRequested = useRef(false);

  // Most visits never open the dialog, so its three option lists wait for it
  const openDialog = useCallback((open: boolean) => {
    setInternalOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  useEffect(() => {
    if (!dialogOpen || pickersRequested.current) return;
    pickersRequested.current = true;
    setPickersLoading(true);
    Promise.all([getAllCompanies(), getAllJobLocations(), getAllContactRoles()])
      .then(([companyList, locationList, roleList]) => {
        if (Array.isArray(companyList)) setCompanies(companyList);
        if (Array.isArray(locationList)) setLocations(locationList);
        if (Array.isArray(roleList)) setRoles(roleList);
      })
      .finally(() => setPickersLoading(false));
  }, [dialogOpen]);

  return (
    <>
      {!hideTrigger && <Button
        variant="outline"
        className="justify-start min-w-0"
        onClick={() => openDialog(true)}
      >
        <Users className="h-3.5 w-3.5 mr-1 shrink-0" />
        <span className="min-w-0 truncate">Add Contact</span>
      </Button>}
      <AddContact
        hideTrigger
        dialogOpen={dialogOpen}
        setDialogOpen={openDialog}
        pickersLoading={pickersLoading}
        companies={companies}
        locations={locations}
        roles={roles}
        reloadContacts={() => {}}
        resetEditContact={() => {}}
      />
    </>
  );
}
