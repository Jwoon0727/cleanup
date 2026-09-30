"use client";

import Image from "next/image";
import { useEffect } from "react";

export function FullscreenImageDialog({
  open,
  onClose,
  src,
  label,
}: {
  open: boolean;
  onClose: () => void;
  src: string;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
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
  );
}
