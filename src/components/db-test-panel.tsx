"use client";

import { useActionState } from "react";

import {
  createDbTestNote,
  deleteDbTestNote,
  type DbTestState,
} from "@/actions/db-test";
import type { DbTestNote } from "@/types/db";

const initialState: DbTestState = { ok: false, message: "" };

type DbTestPanelProps = {
  notes: DbTestNote[];
  fetchError: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function DbTestPanel({ notes, fetchError }: DbTestPanelProps) {
  const [createState, createAction, isCreating] = useActionState(
    createDbTestNote,
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteDbTestNote,
    initialState,
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">데이터 입력</h2>
        <p className="mt-1 text-sm text-zinc-500">
          메시지를 입력하면 Supabase `db_test_notes` 테이블에 저장됩니다.
        </p>

        <form action={createAction} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-zinc-700">
            메시지
            <input
              name="message"
              type="text"
              required
              maxLength={500}
              placeholder="예: Supabase 연결 테스트"
              className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
            />
          </label>

          <button
            type="submit"
            disabled={isCreating}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "저장 중..." : "저장하기"}
          </button>

          {createState.message ? (
            <p
              className={`text-sm ${createState.ok ? "text-emerald-600" : "text-red-600"}`}
            >
              {createState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900">저장된 데이터</h2>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
            {notes.length}건
          </span>
        </div>

        {fetchError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            조회 오류: {fetchError}
          </p>
        ) : null}

        {deleteState.message ? (
          <p
            className={`mt-4 text-sm ${deleteState.ok ? "text-emerald-600" : "text-red-600"}`}
          >
            {deleteState.message}
          </p>
        ) : null}

        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            아직 저장된 데이터가 없습니다.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{note.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDate(note.created_at)}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                    {note.id}
                  </p>
                </div>

                <form action={deleteAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <button
                    type="submit"
                    disabled={isDeleting}
                    className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
