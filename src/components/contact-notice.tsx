/** tel: 링크용으로 숫자와 + 만 남긴다. */
export function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

const badgeClass =
  "inline-flex max-w-full flex-wrap items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium leading-5 text-blue-700 ring-1 ring-inset ring-blue-200";

const phoneLinkClass =
  "underline decoration-blue-400/70 underline-offset-2 hover:text-blue-900";

export function ContactNotice({
  contactName,
  contactPhone,
  className = badgeClass,
}: {
  contactName?: string | null;
  contactPhone?: string | null;
  className?: string;
}) {
  const name = contactName?.trim() || "";
  const phone = contactPhone?.trim() || "";
  if (!name && !phone) return null;

  const phoneLink = phone ? (
    <a href={toTelHref(phone)} className={phoneLinkClass}>
      {phone}
    </a>
  ) : null;

  return (
    <span className={className}>
      {name && phone ? (
        <>
          청소가 완료되면 {name} 요원 형제({phoneLink})에게 연락바랍니다.
        </>
      ) : name ? (
        <>청소가 완료되면 {name} 요원 형제에게 연락바랍니다.</>
      ) : (
        <>청소가 완료되면 {phoneLink}으로 연락바랍니다.</>
      )}
    </span>
  );
}
