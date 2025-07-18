// components/InputText.tsx

import React from "react";
import clsx from "clsx";

type InputTextProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const InputText = React.forwardRef<HTMLInputElement, InputTextProps>(
  ({ className, error, ...rest }, ref) => {
    return (
      <input
        ref={ref}
        {...rest}
        className={clsx(
          "w-full px-4 py-2 rounded-xl border outline-none transition-all",
          error
            ? "border-red-500 focus:ring-red-300"
            : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-300",
          "placeholder-gray-400  shadow-sm",
          className
        )}
      />
    );
  }
);

InputText.displayName = "InputText";

export default InputText;
