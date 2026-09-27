"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

export type CleaningTool = { id: string; label: string };

/** 체크 항목. `note` 는 라벨 아래 보조 안내 */
export type ChecklistItem =
  | string
  | { label: string; note?: string };

export type ChecklistGroup = {
  title: string;
  hint?: string;
  items: ChecklistItem[];
};

export function checklistItemLabel(item: ChecklistItem): string {
  return typeof item === "string" ? item : item.label;
}

export function checklistItemNote(item: ChecklistItem): string | undefined {
  return typeof item === "string" ? undefined : item.note;
}

export type ChecklistTabDef = {
  kind: "checklist";
  key: string;
  label: string;
  short: string;
  groups: ChecklistGroup[];
};

export type SuppliesTabDef = {
  kind: "supplies";
  key: "supplies";
  label: string;
  short: string;
};

export type ZoneTabDef = ChecklistTabDef | SuppliesTabDef;

export type ZoneChecklistConfig = {
  headerTitle: string;
  areaDescription: string;
  footerNote: string;
  checklistStorageKey: string;
  suppliesStorageKey: string;
  cleaningTools: readonly CleaningTool[];
  tabs: ZoneTabDef[];
  defaultTabKey: string;
  /** Tailwind grid classes for tab buttons */
  tabGridClass?: string;
};

type SuppliesSnapshot = {
  qty: Record<string, string>;
  returnOk: Record<string, boolean>;
};

const emptySupplies: SuppliesSnapshot = { qty: {}, returnOk: {} };

function keyOf(tabKey: string, gi: number, ii: number) {
  return `${tabKey}::${gi}::${ii}`;
}

function countChecklistTab(
  tab: ChecklistTabDef,
  checked: Record<string, boolean>,
) {
  let total = 0;
  let done = 0;
  tab.groups.forEach((g, gi) => {
    g.items.forEach((_, ii) => {
      total += 1;
      if (checked[keyOf(tab.key, gi, ii)]) done += 1;
    });
  });
  return { total, done };
}

function countSuppliesTab(
  supplies: SuppliesSnapshot,
  cleaningTools: readonly CleaningTool[],
) {
  const toolCount = cleaningTools.length;
  const qtyDone = cleaningTools.filter(
    (t) => (supplies.qty[t.id] ?? "").trim().length > 0,
  ).length;
  const returnDone = cleaningTools.filter((t) => supplies.returnOk[t.id])
    .length;
  return {
    total: toolCount * 2,
    done: qtyDone + returnDone,
    qtyDone,
    qtyTotal: toolCount,
    returnDone,
    returnTotal: toolCount,
  };
}

function countTab(
  tab: ZoneTabDef,
  checked: Record<string, boolean>,
  supplies: SuppliesSnapshot,
  cleaningTools: readonly CleaningTool[],
) {
  if (tab.kind === "supplies") return countSuppliesTab(supplies, cleaningTools);
  return countChecklistTab(tab, checked);
}

function createChecklistStore(storageKey: string) {
  const listeners = new Set<() => void>();
  let cachedSnapshot: Record<string, boolean> = {};
  let cachedSnapshotRaw: string | null = null;
  const emptySnapshot: Record<string, boolean> = {};

  function read(): Record<string, boolean> {
    if (typeof window === "undefined") return cachedSnapshot;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    if (raw === cachedSnapshotRaw) return cachedSnapshot;
    cachedSnapshotRaw = raw;
    try {
      cachedSnapshot = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      cachedSnapshot = {};
    }
    return cachedSnapshot;
  }

  function write(next: Record<string, boolean>) {
    cachedSnapshot = next;
    cachedSnapshotRaw = JSON.stringify(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, cachedSnapshotRaw);
      } catch {
        // ignore
      }
    }
    listeners.forEach((fn) => fn());
  }

  function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  function getServerSnapshot() {
    return emptySnapshot;
  }

  return { read, write, subscribe, getServerSnapshot };
}

function createSuppliesStore(storageKey: string) {
  const listeners = new Set<() => void>();
  let cachedSupplies: SuppliesSnapshot = emptySupplies;
  let cachedSuppliesRaw: string | null = null;

  function read(): SuppliesSnapshot {
    if (typeof window === "undefined") return cachedSupplies;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    if (raw === cachedSuppliesRaw) return cachedSupplies;
    cachedSuppliesRaw = raw;
    try {
      const parsed = raw ? (JSON.parse(raw) as SuppliesSnapshot) : emptySupplies;
      cachedSupplies = {
        qty: parsed.qty ?? {},
        returnOk: parsed.returnOk ?? {},
      };
    } catch {
      cachedSupplies = emptySupplies;
    }
    return cachedSupplies;
  }

  function write(next: SuppliesSnapshot) {
    cachedSupplies = next;
    cachedSuppliesRaw = JSON.stringify(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, cachedSuppliesRaw);
      } catch {
        // ignore
      }
    }
    listeners.forEach((fn) => fn());
  }

  function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  function getServerSnapshot() {
    return emptySupplies;
  }

  return { read, write, subscribe, getServerSnapshot };
}

const inputClass =
  "w-20 rounded-lg border-0 bg-white px-2.5 py-2 text-center text-sm text-zinc-900 tabular-nums ring-1 ring-inset ring-brand-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand-500 sm:w-24";

export function ZoneChecklist({ config }: { config: ZoneChecklistConfig }) {
  const {
    headerTitle,
    areaDescription,
    footerNote,
    checklistStorageKey,
    suppliesStorageKey,
    cleaningTools,
    tabs,
    defaultTabKey,
    tabGridClass = "grid grid-cols-2 gap-1.5 sm:grid-cols-3",
  } = config;

  const idPrefix = checklistStorageKey.replace(/[^a-z0-9]/gi, "-");

  const checklistStore = useMemo(
    () => createChecklistStore(checklistStorageKey),
    [checklistStorageKey],
  );
  const suppliesStore = useMemo(
    () => createSuppliesStore(suppliesStorageKey),
    [suppliesStorageKey],
  );

  const [active, setActive] = useState(defaultTabKey);
  const checked = useSyncExternalStore(
    checklistStore.subscribe,
    checklistStore.read,
    checklistStore.getServerSnapshot,
  );
  const supplies = useSyncExternalStore(
    suppliesStore.subscribe,
    suppliesStore.read,
    suppliesStore.getServerSnapshot,
  );

  const hydrated = useSyncExternalStore(
    checklistStore.subscribe,
    () => true,
    () => false,
  );

  const toggle = (id: string) => {
    const snap = checklistStore.read();
    checklistStore.write({ ...snap, [id]: !snap[id] });
  };

  const setToolQty = (toolId: string, value: string) => {
    const snap = suppliesStore.read();
    suppliesStore.write({
      ...snap,
      qty: { ...snap.qty, [toolId]: value },
    });
  };

  const toggleReturnOk = (toolId: string) => {
    const snap = suppliesStore.read();
    suppliesStore.write({
      ...snap,
      returnOk: { ...snap.returnOk, [toolId]: !snap.returnOk[toolId] },
    });
  };

  const resetActive = () => {
    const tab = tabs.find((t) => t.key === active);
    if (!tab) return;
    if (!confirm(`"${tab.short}" 탭의 입력·체크를 모두 초기화할까요?`)) {
      return;
    }
    if (active === "supplies") {
      suppliesStore.write(emptySupplies);
      return;
    }
    const next = { ...checklistStore.read() };
    Object.keys(next).forEach((k) => {
      if (k.startsWith(`${active}::`)) delete next[k];
    });
    checklistStore.write(next);
  };

  const activeTab = tabs.find((t) => t.key === active)!;
  const activeCount = countTab(activeTab, checked, supplies, cleaningTools);
  const suppliesProgress =
    activeTab.kind === "supplies"
      ? countSuppliesTab(supplies, cleaningTools)
      : null;

  const checklistTab =
    activeTab.kind === "checklist" ? activeTab : null;

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-brand-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-zinc-900">{headerTitle}</h2>
          <p className="text-xs text-zinc-500">{areaDescription}</p>
        </div>
        <button
          type="button"
          onClick={resetActive}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-brand-100 transition hover:bg-brand-50 hover:text-zinc-800"
        >
          현재 탭 초기화
        </button>
      </div>

      <div
        role="tablist"
        aria-label="청소 체크리스트 시점"
        className={tabGridClass}
      >
        {tabs.map((tab) => {
          const { done, total } = countTab(
            tab,
            checked,
            supplies,
            cleaningTools,
          );
          const isActive = tab.key === active;
          const complete = hydrated && total > 0 && done === total;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={[
                "flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left transition",
                "ring-1 ring-inset",
                isActive
                  ? "bg-brand-500 text-white ring-brand-500 shadow-sm"
                  : "bg-white text-zinc-700 ring-brand-100 hover:bg-brand-50",
              ].join(" ")}
            >
              <span className="text-sm font-semibold leading-tight">
                {tab.label}
              </span>
              <span
                className={[
                  "text-[11px] font-medium tabular-nums",
                  isActive
                    ? "text-white/85"
                    : complete
                      ? "text-emerald-600"
                      : "text-zinc-500",
                ].join(" ")}
              >
                {hydrated ? `${done} / ${total}` : `0 / ${total}`}
                {complete ? " ✓ 완료" : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 ring-1 ring-inset ring-brand-100">
        <span className="font-semibold">{activeTab.label}</span>
        {suppliesProgress ? (
          <span className="tabular-nums">
            수량 {suppliesProgress.qtyDone}/{suppliesProgress.qtyTotal} · 반납
            확인 {suppliesProgress.returnDone}/{suppliesProgress.returnTotal}
          </span>
        ) : (
          <span className="tabular-nums">
            완료 {activeCount.done} / {activeCount.total}
          </span>
        )}
        <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-brand-100">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{
              width: `${activeCount.total === 0 ? 0 : (activeCount.done / activeCount.total) * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        role="tabpanel"
        aria-label={activeTab.label}
        className="flex flex-col gap-4"
      >
        {checklistTab?.key === "frequent" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
            대회 중 <strong className="font-semibold">수시로</strong> 담당
            구역을 돌며 점검할 때 체크하세요. 한 바퀴 순찰이 끝나면 우측 상단{" "}
            <strong className="font-semibold">현재 탭 초기화</strong>로 다음
            순찰을 시작할 수 있습니다.
          </p>
        ) : null}
        {checklistTab?.key === "session" ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 ring-1 ring-inset ring-amber-200">
            <strong className="font-semibold">회기 중</strong> 담당 구역을
            점검할 때 체크하세요. 한 바퀴 점검이 끝나면 우측 상단{" "}
            <strong className="font-semibold">현재 탭 초기화</strong>로 다음
            점검을 시작할 수 있습니다.
          </p>
        ) : null}

        {activeTab.kind === "supplies" ? (
          <>
            <div className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-inset ring-brand-100">
              <h3 className="text-sm font-bold text-zinc-900">
                청소 도구 수량 확인
              </h3>
              <p className="mt-1 text-xs text-zinc-600">
                청소 도구를 가져갈 때 각 항목의 수량을 기입하세요.
              </p>

              <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-inset ring-brand-100">
                <div className="grid grid-cols-[1fr_auto] gap-2 bg-brand-100/80 px-3 py-2 text-xs font-semibold text-zinc-700">
                  <span>도구명</span>
                  <span className="w-20 text-center sm:w-24">수량</span>
                </div>
                <ul className="divide-y divide-brand-100 bg-white">
                  {cleaningTools.map((tool) => {
                    const value = supplies.qty[tool.id] ?? "";
                    const filled = value.trim().length > 0;
                    const qtyId = `${idPrefix}-qty-${tool.id}`;
                    return (
                      <li
                        key={tool.id}
                        className={[
                          "grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5",
                          filled ? "bg-emerald-50/40" : "",
                        ].join(" ")}
                      >
                        <label htmlFor={qtyId} className="text-sm text-zinc-800">
                          {tool.label}
                        </label>
                        <input
                          id={qtyId}
                          type="text"
                          inputMode="numeric"
                          value={value}
                          onChange={(e) => setToolQty(tool.id, e.target.value)}
                          placeholder="0"
                          className={inputClass}
                          aria-label={`${tool.label} 수량`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-inset ring-brand-100">
              <h3 className="text-sm font-bold text-zinc-900">반납 수량 확인</h3>
              <p className="mt-2 rounded-lg bg-white px-3 py-2.5 text-sm leading-6 text-zinc-800 ring-1 ring-inset ring-brand-100">
                청소 도구를 반납하면서{" "}
                <strong className="font-semibold text-brand-700">
                  위 수량과 동일한지
                </strong>{" "}
                체크하고, 동일하면{" "}
                <strong className="font-semibold text-brand-700">O</strong>
                표시를 하십시오.
              </p>

              <ul className="mt-3 flex flex-col gap-1.5">
                {cleaningTools.map((tool) => {
                  const returnId = `${idPrefix}-return-${tool.id}`;
                  const isChecked = !!supplies.returnOk[tool.id];
                  const qty = (supplies.qty[tool.id] ?? "").trim();
                  return (
                    <li key={returnId}>
                      <label
                        htmlFor={returnId}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition",
                          "ring-1 ring-inset",
                          isChecked
                            ? "bg-emerald-50 ring-emerald-200"
                            : "bg-white ring-brand-100 hover:bg-brand-50",
                        ].join(" ")}
                      >
                        <input
                          id={returnId}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleReturnOk(tool.id)}
                          className="h-5 w-5 shrink-0 rounded border-brand-300 accent-brand-500"
                        />
                        <span className="min-w-0 flex-1 text-sm text-zinc-800">
                          <span className="font-medium">{tool.label}</span>
                          {qty ? (
                            <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                              (수령 수량: {qty})
                            </span>
                          ) : null}
                        </span>
                        <span
                          aria-hidden
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-inset",
                            isChecked
                              ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                              : "bg-zinc-50 text-zinc-300 ring-zinc-200",
                          ].join(" ")}
                        >
                          O
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : (
          checklistTab?.groups.map((group, gi) => (
            <div
              key={`${checklistTab.key}-${gi}`}
              className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-inset ring-brand-100"
            >
              <h3 className="text-sm font-bold text-black">{group.title}</h3>
              {group.hint ? (
                <p className="mt-1 text-xs font-normal text-blue-600">{group.hint}</p>
              ) : null}

              <ul className="mt-3 flex flex-col gap-1.5">
                {group.items.map((item, ii) => {
                  const id = keyOf(checklistTab.key, gi, ii);
                  const isChecked = !!checked[id];
                  const label = checklistItemLabel(item);
                  const note = checklistItemNote(item);
                  return (
                    <li key={id}>
                      <label
                        htmlFor={id}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition",
                          "ring-1 ring-inset",
                          isChecked
                            ? "bg-emerald-50 ring-emerald-200"
                            : "bg-white ring-brand-100 hover:bg-brand-50",
                        ].join(" ")}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(id)}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-brand-300 accent-brand-500"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span
                            className={[
                              "text-sm leading-6",
                              isChecked
                                ? "text-emerald-900 line-through decoration-emerald-400/70"
                                : "text-zinc-800",
                            ].join(" ")}
                          >
                            {label}
                          </span>
                          {note ? (
                            <span className="text-xs leading-5 text-blue-600">
                              {note}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <p className="text-[11px] text-zinc-500">{footerNote}</p>
    </section>
  );
}
