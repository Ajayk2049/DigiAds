'use client';

import React from 'react';

/**
 * Renders an optimized, scannable QR Code for UPI payment
 */
export default function QrCodeView({ value, size = 180, className = '' }) {
  if (!value) return null;

  // Use encoded high-contrast SVG QR image for pixel-perfect scanning & print capability
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=1&format=svg&data=${encodeURIComponent(
    value
  )}`;

  return (
    <div
      className={`inline-flex flex-col items-center justify-center p-2.5 rounded-xl bg-white border border-border/80 shadow-sm ${className}`}
    >
      <img
        src={qrUrl}
        alt="UPI Payment QR Code"
        width={size}
        height={size}
        className="w-auto h-auto block select-none"
        loading="eager"
      />
    </div>
  );
}
