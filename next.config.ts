import type { NextConfig } from "next";

// 구역 이미지·조직도는 행사 기간 바뀌지 않으므로 한 번 받으면 브라우저에 1년간 보관한다.
// [주의] 이미지를 교체할 때는 파일 이름을 바꿔야 이미 받은 기기에도 새 이미지가 보인다.
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  images: {
    // 최적화된 이미지(/_next/image) 캐시 기간. 원본 Cache-Control 과 둘 중 긴 쪽이 적용된다.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [
      {
        source: "/zones/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE_CACHE }],
      },
      {
        // 구역 URL 의 토큰이 외부 사이트로 새어 나가지 않도록 한다.
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/c/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
