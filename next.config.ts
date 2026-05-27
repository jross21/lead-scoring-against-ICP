import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/score": ["./RUBRIC.md"],
  },
};

export default nextConfig;
