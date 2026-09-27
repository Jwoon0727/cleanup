"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // 클립보드 권한이 없는 환경에서는 프롬프트로 대체
      window.prompt("아래 URL 을 복사하세요", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-50"
    >
      {copied ? "복사됨" : "봉사자 URL 복사"}
    </button>
  );
}
