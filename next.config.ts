import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/pesquisas-links",
        destination: "/links",
        permanent: true,
      },
      {
        source: "/manifest.json",
        destination: "/site.webmanifest",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
