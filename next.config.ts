import type { NextConfig } from "next";

const allowedCloudOrigins = [
  "**.run.app",
  "*.europe-west2.run.app",
  "ais-dev-jb7fn263oxcmjd6ys6szdd-772466434061.europe-west2.run.app",
  "ais-pre-jb7fn263oxcmjd6ys6szdd-772466434061.europe-west2.run.app",
  "localhost",
  "**.localhost",
];

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: allowedCloudOrigins,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
      allowedOrigins: allowedCloudOrigins,
    },
  },
};

export default nextConfig;
