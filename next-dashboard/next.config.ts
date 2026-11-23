import type { NextConfig } from "next";

// gis-api(Spring Boot) 주소. 브라우저는 /api/... 로 요청하고 Next가 백엔드로 전달한다(CORS 불필요).
const GIS_API_URL = process.env.GIS_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // 지도가 메인(/)으로 옮겨져서 예전 주소는 메인으로 보낸다
  async redirects() {
    return [{ source: "/map", destination: "/", permanent: false }];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${GIS_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
