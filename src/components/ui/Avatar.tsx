import Image from "next/image";

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

const peachTints = [
  { stroke0: "#E5654E", stroke1: "#E8C1B0", fill0: "#E5654E", fill1: "#EDD5C8" }, // coral (default)
  { stroke0: "#7BAAAE", stroke1: "#B5D5D8", fill0: "#7BAAAE", fill1: "#D4E8EA" }, // teal
  { stroke0: "#4F7BE8", stroke1: "#8BAAF0", fill0: "#4F7BE8", fill1: "#B8CFF7" }, // blue
  { stroke0: "#6BA887", stroke1: "#A8D4BC", fill0: "#6BA887", fill1: "#C8E6D5" }, // sage
  { stroke0: "#C4859A", stroke1: "#DBAEBB", fill0: "#C4859A", fill1: "#EDCFD8" }, // mauve
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
  const tint = peachTints[hash % peachTints.length];
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
      {/* Peach body */}
      <ellipse cx="32" cy="32" rx="27" ry="27" fill={`url(#${id}-f)`} stroke={`url(#${id}-s)`} strokeWidth="3" />
      {/* Crease */}
      <path d="M32 6 Q29 30 32 58" stroke={`url(#${id}-s)`} strokeWidth="1.8" fill="none" opacity="0.3" />
    </svg>
  );
}
