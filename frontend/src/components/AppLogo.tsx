import Image from "next/image";
import { cn } from "@/lib/utils";
import schoolLogo from "@/assets/images/school-logo.jpg";

type AppLogoProps = {
  size?: "hero" | "large" | "small";
  className?: string;
  priority?: boolean;
};

const sizeClassMap = {
  hero: "h-24 w-24 md:h-32 md:w-32",
  large: "h-16 w-16 md:h-20 md:w-20",
  small: "h-10 w-10 md:h-12 md:w-12"
} as const;

export default function AppLogo({
  size = "small",
  className,
  priority = false
}: AppLogoProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-blue-100 bg-white p-1 shadow-sm",
        sizeClassMap[size],
        className
      )}
    >
      <Image
        src={schoolLogo}
        alt="Lead City University logo"
        className="h-full w-full rounded-xl object-contain"
        priority={priority}
      />
    </div>
  );
}
