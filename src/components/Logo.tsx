"use client";

import React from "react";

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="logo-svg"
      style={{ display: "block" }}
    >
      {/* Outer camera/scanning corner brackets */}
      <path d="M4.5 2.5H2.5v2" opacity="0.8" />
      <path d="M19.5 2.5h2v2" opacity="0.8" />
      <path d="M4.5 21.5H2.5v-2" opacity="0.8" />
      <path d="M19.5 21.5h2v-2" opacity="0.8" />

      {/* Dashed outer iris / target ring */}
      <circle cx="12" cy="12" r="7.5" strokeDasharray="3 2" opacity="0.45" />

      {/* Stylized brain structure (neural nodes) in the center */}
      {/* Central synapse paths */}
      <path d="M12 7.5L9.5 11" opacity="0.85" />
      <path d="M12 7.5L14.5 11" opacity="0.85" />
      <path d="M9.5 11L12 14.5" opacity="0.85" />
      <path d="M14.5 11L12 14.5" opacity="0.85" />
      <path d="M9.5 11H14.5" opacity="0.5" />

      <path d="M9.5 11L7 11" opacity="0.6" />
      <path d="M14.5 11L17 11" opacity="0.6" />
      <path d="M12 7.5V5.5" opacity="0.6" />
      <path d="M12 14.5v2" opacity="0.6" />

      {/* Nodes / synapses */}
      {/* Central vertical axis */}
      <circle cx="12" cy="7.5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="14.5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="5.5" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" opacity="0.7" />

      {/* Left hemisphere */}
      <circle cx="9.5" cy="11" r="1.8" fill="currentColor" />
      <circle cx="7" cy="11" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="8" cy="8.5" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="8" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
      <path d="M9.5 11L8 8.5" opacity="0.5" />
      <path d="M9.5 11L8 13.5" opacity="0.5" />

      {/* Right hemisphere */}
      <circle cx="14.5" cy="11" r="1.8" fill="currentColor" />
      <circle cx="17" cy="11" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="8.5" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
      <path d="M14.5 11L16 8.5" opacity="0.5" />
      <path d="M14.5 11L16 13.5" opacity="0.5" />
    </svg>
  );
}
