import React from "react";
import clsx from "clsx";

type CardProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
};

// กล่องสไตล์ดินน้ำมัน ใช้แบ่ง section บนหน้าจอ
const Card = ({ children, title, description, icon, className }: CardProps) => {
  return (
    <section
      className={clsx(
        "rounded-[1.75rem] border-[3px] border-clayEdge bg-surface p-5 shadow-clay sm:p-6",
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 flex items-start gap-3">
          {icon && (
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-clayEdge bg-mediumYellow text-darkBrown shadow-clay-sm"
            >
              {icon}
            </span>
          )}
          <div>
            {title && <h2 className="text-xl font-medium leading-tight text-lightBrown">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
};

export default Card;
