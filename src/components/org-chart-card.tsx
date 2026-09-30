import { existsSync } from "node:fs";
import path from "node:path";
import { OrgChartCardClient } from "@/components/org-chart-card-client";

const ORG_CHART_FILENAME = "조직도.png";

/** 구역 카드 그리드용 조직도 카드 (`public/zones/조직도.png`) */
export function OrgChartCard() {
  const filePath = path.join(process.cwd(), "public", "zones", ORG_CHART_FILENAME);
  if (!existsSync(filePath)) return null;

  return <OrgChartCardClient />;
}
