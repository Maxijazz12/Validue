"use client";

import Image from "next/image";
import { useState } from "react";

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

const warmTints = [
  { stroke0: "#E8845C", stroke1: "#F0A882", fill0: "#E8845C", fill1: "#F0A882" },
  { stroke0: "#E8845C", stroke1: "#F0A882", fill0: "#E8845C", fill1: "#F0A882" },
  { stroke0: "#E8845C", stroke1: "#F0A882", fill0: "#E8845C", fill1: "#F0A882" },
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export default function Avatar({ name, imageUrl, size = 36, className = "" }: AvatarProps) {
  const [loaded, setLoaded] = useState(false);

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover img-blur-up ${loaded ? "loaded" : ""} ${className}`}
        onLoad={() => setLoaded(true)}
        unoptimized
      />
    );
  }

  const hash = hashName(name);
  const tint = warmTints[hash % warmTints.length];
  const id = `av-${hash}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tint.stroke0} />
          <stop offset="100%" stopColor={tint.stroke1} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tint.fill0} stopOpacity="0.12" />
          <stop offset="100%" stopColor={tint.fill1} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <g transform="translate(32,32) scale(0.82) translate(-32,-32)">
        <ellipse cx="32" cy="34" rx="22" ry="22" fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} strokeWidth="2" />
        <ellipse cx="32" cy="34" rx="20" ry="20" fill="white" opacity="0.1" />
        <path d="M32 13 Q29.5 32 32 55" stroke={`url(#${id}-s)`} strokeWidth="1.2" fill="none" opacity="0.3" />
      </g>
    </svg>
  );
}
