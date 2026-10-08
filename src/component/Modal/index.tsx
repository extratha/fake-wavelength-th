import { ReactNode, useEffect } from "react";
import Button from "@/component/Button";

export interface ModalOptions {
  open: boolean;
  message?: string;
  onClose?: () => void;
}

export default function Modal({ options, children }: { options: ModalOptions, children?: ReactNode }) {
  const { open, message, onClose } = options;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // กด Esc เพื่อปิด (เฉพาะ modal ที่ปิดได้)
  useEffect(() => {
    if (!open || !onClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop-in fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal-panel-in w-full max-w-sm rounded-[1.75rem] border-[3px] border-clayEdge bg-lightBrown p-6 text-darkBrown shadow-clay"
        onClick={(e) => e.stopPropagation()}
      >
        {message && <p className="font-display text-xl font-medium">{message}</p>}

        {onClose &&
          <div className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={handleClose}>
              ปิด
            </Button>
          </div>
        }
        {children}
      </div>
    </div>
  );
}
