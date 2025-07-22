import { ReactNode } from "react";

export interface ModalOptions {
  open: boolean;
  message?: string;
  onClose?: () => void;
}

export default function Modal({ options, children }: { options: ModalOptions, children?: ReactNode }) {
  const { open, message, onClose } = options;
  if (!open) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 999,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#F0F2BD",
          padding: 24,
          borderRadius: 12,
          minWidth: 300,
          color: "#4B352A"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 20, color: '#4B352A', fontWeight: 500 }}>{message}</p>

        {onClose &&
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleClose}
              className="justify-self-end mt-4 px-4 py-2 rounded bg-[#CA7842] text-white cursor-pointer shadow-[0_2px_4px_rgba(202,120,66,0.6)] transition-shadow duration-200 active:scale-95 transition-transform"
            >
              ปิด
            </button>
          </div>
        }
        {children}
      </div>
    </div>
  );
}
