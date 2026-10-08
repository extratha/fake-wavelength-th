import React from "react";
import clsx from "clsx";

type IconButtonVariant = "primary" | "secondary" | "ghost";
type IconButtonSize = "md" | "lg";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  // ปุ่มที่มีแต่ไอคอนต้องมีชื่อให้โปรแกรมอ่านหน้าจอเสมอ
  "aria-label": string;
  children: React.ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};

const VARIANT_CLASS: Record<IconButtonVariant, string> = {
  primary: "bg-mediumYellow text-darkBrown border-clayEdge shadow-clay-sm",
  secondary: "bg-lightBrown text-darkBrown border-clayEdge shadow-clay-sm",
  ghost: "bg-transparent text-lightBrown border-transparent shadow-none hover:bg-white/10",
};

const SIZE_CLASS: Record<IconButtonSize, string> = {
  md: "h-11 min-w-[44px] px-2 text-base",
  lg: "h-14 min-w-[56px] px-3 text-lg",
};

// ปุ่มกลม ๆ สำหรับไอคอนหรือข้อความสั้น ๆ เช่น +1, −10, ⋮ (ขนาดกดได้ไม่ต่ำกว่า 44px)
const IconButton = ({ children, className, variant = "secondary", size = "md", type = "button", ...rest }: IconButtonProps) => {
  return (
    <button
      type={type}
      {...rest}
      className={clsx(
        "inline-flex items-center justify-center rounded-full border-[3px] font-display font-medium",
        "cursor-pointer select-none transition-[transform,box-shadow,background-color] duration-150 ease-out",
        variant !== "ghost" && "active:translate-y-[3px] active:shadow-clay-pressed",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
    >
      {children}
    </button>
  );
};

export default IconButton;
