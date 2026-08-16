import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/pessoas", permanent: true },
      { source: "/admin/pessoas/nova", destination: "/pessoas/nova", permanent: true },
      { source: "/admin/pessoas/:id", destination: "/pessoas/:id", permanent: true },
    ];
  },
};

export default nextConfig;
