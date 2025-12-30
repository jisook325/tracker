import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Build을 막지 않도록 lint 오류는 배포 시 무시합니다.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
