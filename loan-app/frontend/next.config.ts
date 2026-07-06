import type { NextConfig } from "next";
import { buildFrameAncestorsCsp } from "./src/lib/frame-ancestors-csp";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    const csp = buildFrameAncestorsCsp();

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
