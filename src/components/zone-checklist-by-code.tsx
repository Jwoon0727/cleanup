"use client";

import { ZoneAChecklist } from "@/components/zone-a-checklist";
import { ZoneBChecklist } from "@/components/zone-b-checklist";
import { ZoneCChecklist } from "@/components/zone-c-checklist";
import { ZoneDChecklist } from "@/components/zone-d-checklist";
import { ZoneEChecklist } from "@/components/zone-e-checklist";
import { ZoneFChecklist } from "@/components/zone-f-checklist";
import { ZoneGChecklist } from "@/components/zone-g-checklist";
import { ZoneHChecklist } from "@/components/zone-h-checklist";

export function ZoneChecklistByCode({ code }: { code: string }) {
  switch (code.toUpperCase()) {
    case "A":
      return <ZoneAChecklist />;
    case "B":
      return <ZoneBChecklist />;
    case "C":
      return <ZoneCChecklist />;
    case "D":
      return <ZoneDChecklist />;
    case "E":
      return <ZoneEChecklist />;
    case "F":
      return <ZoneFChecklist />;
    case "G":
      return <ZoneGChecklist />;
    case "H":
      return <ZoneHChecklist />;
    default:
      return null;
  }
}
