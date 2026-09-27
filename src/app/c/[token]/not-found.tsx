export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-brand-50 px-6 py-16">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-zinc-900">
          유효하지 않은 주소입니다
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          링크가 만료되었거나 잘못 입력되었습니다. 관리자에게 새 URL 을 요청해 주세요.
        </p>
      </div>
    </div>
  );
}
