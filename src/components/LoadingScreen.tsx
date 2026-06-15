"use client";

import Logo from "@/components/Logo";

interface LoadingScreenProps {
  statusText: string;
}

export default function LoadingScreen({ statusText }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      {/* Floating ambient orbs */}
      <div className="loading-orb loading-orb-1" />
      <div className="loading-orb loading-orb-2" />
      <div className="loading-orb loading-orb-3" />

      {/* Gentle pulsing rings */}
      <div className="loading-rings">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
      </div>

      <div className="loading-content">
        {/* Logo: Brain with neural memory nodes */}
        <div className="loading-icon">
          <Logo size={36} />
        </div>

        <h2 className="loading-title">MemoryMate</h2>
        <p className="loading-subtitle">Remembering for you</p>

        <div className="loading-bar-track">
          <div className="loading-bar-fill" />
        </div>

        <div className="spinner" />

        <p className="loading-status">{statusText || "Getting ready for you…"}</p>
        <p className="loading-hint">This takes just a moment</p>
      </div>
    </div>
  );
}
