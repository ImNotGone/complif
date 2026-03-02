import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the standalone Docker image — copies only the files needed
  // to run the app, keeping the image lean.
  output: 'standalone',
};

export default nextConfig;
