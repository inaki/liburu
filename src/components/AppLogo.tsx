import type { ImgHTMLAttributes } from "react";
import { cn } from "../lib/utils";

type AppLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;
const logoMarkUrl = new URL("../../assets/logo-small.svg", import.meta.url).href;

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <img
      src={logoMarkUrl}
      alt=""
      aria-hidden="true"
      className={cn("block object-contain", className)}
      {...props}
    />
  );
}
