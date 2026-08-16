import Image from "next/image";
import Link from "next/link";

export default function Logo({ size = 64, withLink = true }: { size?: number; withLink?: boolean }) {
  const img = (
    <Image
      src="/logo.png"
      alt="Vasantham Furniture & Home Appliances"
      width={size}
      height={size}
      priority
      className="object-contain"
    />
  );
  if (!withLink) return img;
  return <Link href="/">{img}</Link>;
}
