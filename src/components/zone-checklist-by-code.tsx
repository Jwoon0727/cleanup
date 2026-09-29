"use client";

import { ZoneChecklist } from "@/components/zone-checklist";
import type { MarkSnapshot } from "@/lib/check-marks";
import { ZONE_A_CONFIG } from "@/components/zone-a-checklist";
import { ZONE_B_CONFIG } from "@/components/zone-b-checklist";
import { ZONE_C_CONFIG } from "@/components/zone-c-checklist";
import { ZONE_D_CONFIG } from "@/components/zone-d-checklist";
import { ZONE_E_CONFIG } from "@/components/zone-e-checklist";
import { ZONE_F_CONFIG } from "@/components/zone-f-checklist";
import { ZONE_G_CONFIG } from "@/components/zone-g-checklist";
import { ZONE_H_CONFIG } from "@/components/zone-h-checklist";

const CONFIG_BY_CODE = {
  A: ZONE_A_CONFIG,
  B: ZONE_B_CONFIG,
  C: ZONE_C_CONFIG,
  D: ZONE_D_CONFIG,
  E: ZONE_E_CONFIG,
  F: ZONE_F_CONFIG,
  G: ZONE_G_CONFIG,
  H: ZONE_H_CONFIG,
} as const;

export function ZoneChecklistByCode({
  code,
  token,
  initialMarks,
}: {
  code: string;
  token: string;
  initialMarks: MarkSnapshot;
}) {
  const config = CONFIG_BY_CODE[code.toUpperCase() as keyof typeof CONFIG_BY_CODE];
  if (!config) return null;

  return (
    <ZoneChecklist config={config} token={token} initialMarks={initialMarks} />
  );
}
