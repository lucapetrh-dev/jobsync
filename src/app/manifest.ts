import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jobs",
    short_name: "Jobs",
    description: "Track your applications and manage your CVs.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#000000",
    icons: [
      { src: "/icons/jobs-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/jobs-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
