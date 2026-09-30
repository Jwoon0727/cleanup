"use client";

import Image from "next/image";
import { useState } from "react";
import { FullscreenImageDialog } from "@/components/fullscreen-image-dialog";

type Props = {
  src: string;
  label: string;
  /** banner: 대시보드 조직도 등 가로형 — 박스 너비에 맞게 크게 표시 */
  variant?: "zone" | "banner";
};

const previewShell: Record<NonNullable<Props["variant"]>, string> = {
  zone:
    "relative h-60 w-full cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-brand-100 transition hover:ring-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-80 md:h-96",
  banner:
    "relative w-full min-h-[360px] cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-50 ring-1 ring-brand-100 transition hover:ring-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:min-h-[440px] md:min-h-[520px] h-[clamp(360px,52vw,680px)]",
};

export function ZoneImageLightbox({ src, label, variant = "zone" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={previewShell[variant]}
        aria-label={`${label} 전체 화면으로 보기`}
      >
        <Image
          src={src}
          alt={label}
          fill
          priority
          sizes={
            variant === "banner"
              ? "(max-width: 1024px) 100vw, 1024px"
              : "(max-width: 640px) 100vw, 640px"
          }
          className={`pointer-events-none object-contain ${variant === "banner" ? "p-0" : "p-1"}`}
        />
        <span className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
          탭하여 크게 보기
        </span>
      </button>

      <FullscreenImageDialog
        open={open}
        onClose={() => setOpen(false)}
        src={src}
        label={label}
      />
    </>
  );
}
