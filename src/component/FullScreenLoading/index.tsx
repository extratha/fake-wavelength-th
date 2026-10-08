import { LoaderCircle } from "lucide-react";

type FullScreenLoadingProps = {
  message?: string;
};

const FullScreenLoading = ({ message = "กำลังโหลด..." }: FullScreenLoadingProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex items-center gap-3 rounded-[1.75rem] border-[3px] border-clayEdge bg-surface px-6 py-4 shadow-clay">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-mediumYellow" />
        <span className="font-display text-lg text-lightBrown">{message}</span>
      </div>
    </div>
  );
};

export default FullScreenLoading;
