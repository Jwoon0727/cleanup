import Link from "next/link";
import { RefreshPageButton } from "@/components/refresh-page-button";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-50">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight text-zinc-900"
          >
            천안대회회관 청소구역 관리 (충청 6나)
          </Link>
          <RefreshPageButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
