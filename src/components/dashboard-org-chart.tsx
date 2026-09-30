import { existsSync } from "node:fs";
import path from "node:path";
import { ZoneImageLightbox } from "@/components/zone-image-lightbox";

const ORG_CHART_FILENAME = "조직도.png";
const ORG_CHART_SRC = "/zones/조직도.png";

/** 대시보드 구역 카드 아래 `public/zones/조직도.png` */
export function DashboardOrgChart() {
  const filePath = path.join(process.cwd(), "public", "zones", ORG_CHART_FILENAME);
  if (!existsSync(filePath)) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-100">
      <ZoneImageLightbox src={ORG_CHART_SRC} label="조직도" variant="banner" />
    </section>
  );
}
