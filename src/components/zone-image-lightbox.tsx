"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 z-[101] rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            닫기
          </button>

          <div
            className="relative h-[85vh] w-full max-w-[min(100%,1200px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={src}
              alt={label}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
