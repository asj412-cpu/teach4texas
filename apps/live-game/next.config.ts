import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Isolate this app from parent monorepo lockfiles
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
