"use client";

import dynamic from "next/dynamic";

/*
 * The main webcam component must be loaded client-side only because
 * face-api.js accesses browser globals (window, document, HTMLCanvasElement)
 * at module scope, which breaks SSR/prerendering.
 */
const WebcamView = dynamic(() => import("@/components/WebcamView"), {
  ssr: false,
});

export default function Home() {
  return <WebcamView />;
}
