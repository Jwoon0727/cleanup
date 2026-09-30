import { checkKey, returnKey } from "@/lib/check-marks";
import type { ZoneChecklistConfig } from "@/lib/zone-checklist-types";
import { ZONE_A_CONFIG } from "@/lib/zone-configs/zone-a";
import { ZONE_B_CONFIG } from "@/lib/zone-configs/zone-b";
import { ZONE_C_CONFIG } from "@/lib/zone-configs/zone-c";
import { ZONE_D_CONFIG } from "@/lib/zone-configs/zone-d";
import { ZONE_E_CONFIG } from "@/lib/zone-configs/zone-e";
import { ZONE_F_CONFIG } from "@/lib/zone-configs/zone-f";
import { ZONE_G_CONFIG } from "@/lib/zone-configs/zone-g";
import { ZONE_H_CONFIG } from "@/lib/zone-configs/zone-h";

/** 구역 전용(하드코딩) 체크리스트 정의. 서버 액션·클라이언트가 함께 쓴다. */
export const CONFIG_BY_CODE: Record<string, ZoneChecklistConfig> = {
  A: ZONE_A_CONFIG,
  B: ZONE_B_CONFIG,
  C: ZONE_C_CONFIG,
  D: ZONE_D_CONFIG,
  E: ZONE_E_CONFIG,
  F: ZONE_F_CONFIG,
  G: ZONE_G_CONFIG,
  H: ZONE_H_CONFIG,
};

export function getZoneConfig(code: string): ZoneChecklistConfig | undefined {
  return CONFIG_BY_CODE[code.toUpperCase()];
}

/**
 * 제출 전에 반드시 true 여야 하는 체크박스 key 목록.
 * 모든 체크 항목 + 청소 도구 반납 확인. 수량 입력(q:)은 체크박스가 아니므로 제외.
 */
export function requiredMarkKeys(config: ZoneChecklistConfig): string[] {
  const keys: string[] = [];
  for (const tab of config.tabs) {
    if (tab.kind !== "checklist") continue;
    tab.groups.forEach((group, gi) => {
      group.items.forEach((_, ii) => keys.push(checkKey(tab.key, gi, ii)));
    });
  }
  for (const tool of config.cleaningTools) keys.push(returnKey(tool.id));
  return keys;
}
