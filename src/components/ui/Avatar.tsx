import Image from "next/image";

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

const warmTints = [
  { stroke0: "#E8C1B0", stroke1: "#D4A494", fill0: "#E8C1B0", fill1: "#EDD5C8" },
  { stroke0: "#C4A99A", stroke1: "#B09080", fill0: "#C4A99A", fill1: "#DDD0C8" },
  { stroke0: "#D4B4A4", stroke1: "#C09888", fill0: "#D4B4A4", fill1: "#E8D8D0" },
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export default function Avatar({ name, imageUrl, size = 36, className = "" }: AvatarProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
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
      <ellipse cx="32" cy="32" rx="27" ry="27" fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} strokeWidth="3" />
      <path d="M32 6 Q29 30 32 58" stroke={`url(#${id}-s)`} strokeWidth="1.8" fill="none" opacity="0.3" />
    </svg>
  );
}
