import * as z from "zod";

export const submissionSchema = z.object({
  congregation: z.string().trim().min(1, "회중을 입력해 주세요.").max(100),
  volunteerName: z.string().trim().min(1, "이름을 입력해 주세요.").max(50),
});

export const zoneAssigneeSchema = z
  .object({
    assigneeCongregation: z.string().trim().max(100),
    assigneeName: z.string().trim().max(50),
    contactName: z.string().trim().max(50).optional().default(""),
    contactPhone: z.string().trim().max(30).optional().default(""),
  })
  .refine(
    (data) =>
      (data.assigneeCongregation.length === 0) === (data.assigneeName.length === 0),
    {
      message: "회중과 이름을 모두 입력하거나, 모두 비워 지정을 해제해 주세요.",
      path: ["assigneeName"],
    },
  );

export type FormState =
  | { ok: false; message: string; errors?: Record<string, string[]> }
  | { ok: true; message?: string }
  | undefined;
