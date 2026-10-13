import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jobs",
    short_name: "Jobs",
    description: "Track your applications and manage your CVs.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icons/jobs-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/jobs-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
