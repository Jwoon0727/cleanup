/** tel: 링크용으로 숫자와 + 만 남긴다. */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const phoneLinkClass =
  "font-semibold underline decoration-blue-500/60 underline-offset-2 hover:text-blue-950";

export function ContactNotice({
  zoneLabel,
  contactName,
  contactPhone,
}: {
  zoneLabel: string;
  contactName?: string | null;
  contactPhone?: string | null;
}) {
  const name = contactName?.trim() || "";
  const phone = contactPhone?.trim() || "";
  if (!name && !phone) return null;

  const phoneLink = phone ? (
    <a href={toTelHref(phone)} className={phoneLinkClass}>
      {phone}
    </a>
  ) : null;

  const assigneeLine = (
    <>
      ({zoneLabel} 담당자:{" "}
      {name && phone ? (
        <>
          {name} {phoneLink}
        </>
      ) : name ? (
        name
      ) : (
        phoneLink
      )}
      )
    </>
  );

  return (
    <aside className="rounded-2xl bg-blue-50 px-4 py-4 ring-1 ring-inset ring-blue-200 sm:px-5 sm:py-5">
      <p className="text-sm leading-relaxed text-blue-900 sm:text-base">
        청소에 관한 문의 사항이 있을 경우, 청소가 완료된 경우 아래 담당자에게
        연락해 주시기 바랍니다.
      </p>
      <p className="mt-3 text-base font-semibold leading-relaxed text-blue-950 sm:text-lg">
        {assigneeLine}
      </p>
    </aside>
  );
}
