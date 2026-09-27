import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

const EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

/** `public/zones/{CODE}{ext}` 중 존재하는 첫 파일을 찾는다. 없으면 null. */
function findZoneImagePath(code: string): string | null {
  const upperCode = code.toUpperCase();

  for (const ext of EXTENSIONS) {
    const filename = `${upperCode}${ext}`;
    const absolutePath = path.join(process.cwd(), "public", "zones", filename);
    if (existsSync(absolutePath)) {
      return `/zones/${filename}`;
    }
  }

  return null;
}

export function ZoneImage({ code, label }: { code: string; label: string }) {
  const src = findZoneImagePath(code);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-brand-100">
      {src ? (
        <Image
          src={src}
          alt={`${label} 사진`}
          fill
          sizes="(max-width: 640px) 100vw, 640px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 text-center">
          <p className="text-sm text-zinc-500">{label} 이미지 없음</p>
          <p className="text-xs text-zinc-400">public/zones/{code.toUpperCase()}.png</p>
        </div>
      )}
    </div>
  );
}
