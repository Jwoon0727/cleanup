import { existsSync } from "node:fs";
import path from "node:path";
import { ZoneImageLightbox } from "@/components/zone-image-lightbox";

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** 구역별 이미지 파일명. 없으면 `{CODE}{ext}` 규칙을 따른다. */
const ZONE_IMAGE_FILES: Record<string, string> = {
  A: "A-B.png",
  B: "A-B.png",
  D: "D-F.png",
  E: "D-F.png",
  F: "D-F.png",
  G: "G-H.png",
  H: "G-H.png",
};

function publicZoneFileExists(filename: string): boolean {
  return existsSync(path.join(process.cwd(), "public", "zones", filename));
}

/** `public/zones/` 아래 존재하는 이미지 URL. 없으면 null. */
function findZoneImagePath(code: string): string | null {
  const upperCode = code.toUpperCase();

  const mapped = ZONE_IMAGE_FILES[upperCode];
  if (mapped && publicZoneFileExists(mapped)) {
    return `/zones/${mapped}`;
  }

  for (const ext of EXTENSIONS) {
    const filename = `${upperCode}${ext}`;
    if (publicZoneFileExists(filename)) {
      return `/zones/${filename}`;
    }
  }

  return null;
}

export function ZoneImage({ code, label }: { code: string; label: string }) {
  const src = findZoneImagePath(code);

  if (src) {
    return <ZoneImageLightbox src={src} label={label} />;
  }

  return (
    <div className="flex h-60 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-zinc-100 text-center ring-1 ring-brand-100 sm:h-80 md:h-96">
      <p className="text-sm text-zinc-500">{label} 이미지 없음</p>
      <p className="text-xs text-zinc-400">public/zones/{code.toUpperCase()}.png</p>
    </div>
  );
}
