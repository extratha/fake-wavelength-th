import React from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "teamA" | "teamB";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

// สีแต่ละแบบเลือกให้ตัวอักษรอ่านได้ (contrast ≥ 4.5:1)
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-mediumYellow text-darkBrown border-clayEdge shadow-clay-sm hover:brightness-105",
  secondary: "bg-mediumBrown text-ink border-clayEdge shadow-clay-sm hover:brightness-105",
  ghost: "bg-transparent text-lightBrown border-lightBrown/40 shadow-none hover:bg-white/5",
  // พื้นสีทีม + ตัวอักษรเข้ม (ink บน teamB = 4.8:1, บน teamA = 8:1)
  teamA: "bg-teamA text-ink border-clayEdge shadow-clay-sm hover:brightness-105",
  teamB: "bg-teamB text-ink border-clayEdge shadow-clay-sm hover:brightness-105",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "min-h-[44px] px-4 text-sm",
  md: "min-h-[48px] px-5 text-base",
  lg: "min-h-[56px] px-6 text-lg",
};

// ปุ่มสไตล์ดินน้ำมัน: นูนด้วยเงาทึบด้านล่าง กดแล้วยุบลง
const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  ...rest
}: ButtonProps) => {
  return (
    <button
      type={type}
      {...rest}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-clay border-[3px] font-display font-medium",
        "cursor-pointer select-none transition-[transform,box-shadow,filter] duration-150 ease-out",
        "active:translate-y-[3px] active:shadow-clay-pressed",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60 focus-visible:ring-offset-2 focus-visible:ring-offset-darkBrown",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && "w-full",
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
