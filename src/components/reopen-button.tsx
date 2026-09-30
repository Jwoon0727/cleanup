"use client";

import { useActionState } from "react";
import { reopenSubmissionAction } from "@/actions/submissions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/validation";

/** 제출 취소하고 다시 열기. 성공하면 서버 액션의 revalidatePath 로 체크리스트 화면이 돌아온다. */
export function ReopenButton({
  token,
  className = "",
}: {
  token: string;
  className?: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    reopenSubmissionAction,
    undefined,
  );

  return (
    <form
      action={action}
      className={`flex flex-col items-center gap-2 ${className}`}
      onSubmit={(e) => {
        if (
          !confirm(
            "제출을 취소하고 다시 열까요?\n제출 기록은 삭제되고, 체크한 내용은 그대로 남습니다.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="token" value={token} />
      <SubmitButton pending={pending} variant="ghost">
        제출 취소하고 다시 열기
      </SubmitButton>
      {state && !state.ok ? <FormMessage state={state} /> : null}
    </form>
  );
}
