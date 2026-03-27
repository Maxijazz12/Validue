const colors = ["#3b82f6", "#a855f7", "#22c55e", "#e8b87a", "#ef4444", "#06b6d4"];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type AvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
};

export default function Avatar({ name, imageUrl, size = 36, className = "" }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: getColor(name),
        fontSize: size * 0.38,
      }}
    >
      {getInitials(name || "?")}
    </div>
  );
}
