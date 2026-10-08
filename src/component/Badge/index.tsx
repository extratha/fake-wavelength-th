import React from "react";
import clsx from "clsx";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

// ป้ายเล็ก ๆ ทรงแคปซูล เช่น จำนวนผู้เล่น
const Badge = ({ children, className }: BadgeProps) => {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 border-clayEdge bg-surfaceDeep px-2.5 py-0.5 text-sm font-medium text-lightBrown",
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
