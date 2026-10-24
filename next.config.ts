import type { NextConfig } from "next";

// No frame-denying headers: the browser extension embeds /embed in an iframe.
const nextConfig: NextConfig = {
  // Hide the "N" developer badge during npm run dev; errors still show. Never shown in production anyway.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
