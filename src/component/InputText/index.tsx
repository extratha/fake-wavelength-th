// components/InputText.tsx

import React, { useId } from "react";
import clsx from "clsx";

type InputTextProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
  // ป้ายชื่อที่มองเห็นได้ (ไม่ควรใช้ placeholder แทนป้ายชื่อ)
  label?: string;
  // ข้อความแนะนำใต้ช่อง
  hint?: string;
  // ข้อความ error ใต้ช่อง (ถ้ามี จะแสดงแทน hint และขึ้นขอบสีแดง)
  errorMessage?: string;
};

const InputText = React.forwardRef<HTMLInputElement, InputTextProps>(
  ({ className, error, label, hint, errorMessage, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperTextId = `${inputId}-helper`;
    const helperText = errorMessage ?? hint;
    const hasError = error || !!errorMessage;

    const input = (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={hasError || undefined}
        aria-describedby={helperText ? helperTextId : undefined}
        {...rest}
        className={clsx(
          "w-full min-h-[48px] rounded-2xl border-[3px] bg-lightBrown px-4 py-2 text-base text-darkBrown",
          "placeholder:text-darkBrown/50 outline-none transition-[box-shadow,border-color] duration-150",
          "focus-visible:ring-4 focus-visible:ring-mediumYellow/60",
          hasError ? "border-teamB" : "border-clayEdge",
          className
        )}
      />
    );

    // ใช้แบบเดิม (ไม่มี label/hint) ได้เหมือนเดิม
    if (!label && !helperText) return input;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-display text-sm font-medium text-lightBrown">
            {label}
          </label>
        )}
        {input}
        {helperText && (
          <p id={helperTextId} className={clsx("text-sm", errorMessage ? "text-[#ffb3be]" : "text-muted")}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

InputText.displayName = "InputText";

export default InputText;
