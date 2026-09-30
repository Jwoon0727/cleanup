"use client";

import { useState } from "react";
import { FullscreenImageDialog } from "@/components/fullscreen-image-dialog";

const ORG_CHART_SRC = "/zones/조직도.png";

const viewButtonClass =
  "inline-flex items-center rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600";

export function OrgChartCardClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-zinc-900">
              (충청 6나) 청소부 조직도
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={viewButtonClass}
          >
            조직도 보기
          </button>
        </div>
      </div>

      <FullscreenImageDialog
        open={open}
        onClose={() => setOpen(false)}
        src={ORG_CHART_SRC}
        label="(충청 6나) 청소부 조직도"
      />
    </>
  );
}
