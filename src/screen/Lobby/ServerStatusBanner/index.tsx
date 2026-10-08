import { LoaderCircle } from "lucide-react";

type ServerStatusBannerProps = {
  isConnected: boolean;
};

// บอกผู้เล่นว่ากำลังรอ server ตื่น (ตั้งชื่อรอไปก่อนได้) หายไปเมื่อต่อติดแล้ว
const ServerStatusBanner = ({ isConnected }: ServerStatusBannerProps) => {
  if (isConnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-2xl border-[3px] border-clayEdge bg-surfaceDeep px-4 py-3 shadow-clay-sm"
    >
      <LoaderCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-mediumYellow" />
      <div className="text-sm">
        <p className="font-display text-base text-lightBrown">กำลังปลุกเซิร์ฟเวอร์...</p>
        <p className="mt-0.5 text-muted">
          ครั้งแรกอาจใช้ราว 1 นาที ระหว่างนี้ตั้งชื่อรอไว้ได้เลย กดสร้างหรือเข้าห้องไว้ก็ได้ ระบบจะทำให้อัตโนมัติเมื่อพร้อม
        </p>
      </div>
    </div>
  );
};

export default ServerStatusBanner;
