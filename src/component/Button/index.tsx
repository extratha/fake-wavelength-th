import React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

const Button = ({ children, className, ...rest }: ButtonProps) => {
  return (
    <button
      {...rest}
      style={{cursor:'pointer'}}
      className={clsx(
        "px-5 py-2 rounded-xl font-semibold transition-all shadow-md",
        "bg-[#CA7842] text-white hover:bg-[#b36734] focus:ring-2 focus:ring-[#f2b78d] focus:outline-none",
        className
      )}
    >
      {children}
    </button>
  );
};

export default Button;
