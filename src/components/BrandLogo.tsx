import Image from "next/image";

const heights = {
  sm: "h-11 sm:h-12",
  md: "h-16",
  lg: "h-24",
};

export function BrandLogo({
  size = "sm",
  priority = false,
}: {
  size?: keyof typeof heights;
  priority?: boolean;
}) {
  return (
    <Image
      src="/tree-mark.png"
      alt="Rotsen"
      width={1024}
      height={731}
      priority={priority}
      className={`w-auto object-contain ${heights[size]}`}
    />
  );
}
