import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // 봉사자 구역 URL 과 관리자 영역은 색인하지 않는다.
      disallow: ["/c/", "/dashboard/"],
    },
  };
}
