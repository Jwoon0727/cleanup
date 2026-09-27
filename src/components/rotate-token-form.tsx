"use client";

import { useActionState } from "react";
import { rotateZoneTokenAction } from "@/actions/zones";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { FormState } from "@/lib/validation";

export function RotateTokenForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    rotateZoneTokenAction,
    undefined,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <input type="hidden" name="code" value={code} />
        <SubmitButton pending={pending} variant="ghost" className="!px-3 !py-1.5 !text-xs">
          URL 재발급
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
