import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.tos-cn-beijing.volces.com",
      },
    ],
  },
};

export default nextConfig;
