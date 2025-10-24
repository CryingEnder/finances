"use client";

import logo from "../../assets/images/aboba.webp";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withBorder?: boolean;
  borderSize?: "sm" | "md";
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-40 h-40",
};

export default function Logo({
  className = "",
  size = "md",
  withBorder = false,
  borderSize = "md",
}: LogoProps) {
  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden rounded-lg ${className}`}
    >
      <img
        src={logo.src}
        alt="Logo"
        className={`w-full h-full object-cover ${
          withBorder
            ? `rounded-full ${
                borderSize === "sm" ? "border" : "border-2"
              } border-white`
            : ""
        }`}
      />
    </div>
  );
}
