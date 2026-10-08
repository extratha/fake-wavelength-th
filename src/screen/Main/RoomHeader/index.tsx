import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Crown, Link } from "lucide-react";
import Button from "@/component/Button";
import IconButton from "@/component/IconButton";

type RoomHeaderProps = {
  roomId: string;
  playerName: string;
  isHost: boolean;
  onLeaveRoom: () => void;
};

type CopiedTarget = "code" | "link" | null;

const COPIED_FEEDBACK_MS = 2000;

// คัดลอกข้อความ: ใช้ Clipboard API ถ้าได้ (ต้องเป็น https/localhost) ไม่งั้นใช้วิธีเก่าแทน
const copyText = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

// แถบบนสุดของห้อง: ปุ่มกลับ lobby, ชื่อผู้เล่น, รหัสห้อง + ปุ่มคัดลอก
const RoomHeader = ({ roomId, playerName, isHost, onLeaveRoom }: RoomHeaderProps) => {
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget>(null);

  useEffect(() => {
    if (!copiedTarget) return;
    const timer = setTimeout(() => setCopiedTarget(null), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copiedTarget]);

  const handleCopy = async (target: Exclude<CopiedTarget, null>) => {
    const roomLink = `${window.location.origin}/main?room=${encodeURIComponent(roomId)}`;
    try {
      await copyText(target === "code" ? roomId : roomLink);
      setCopiedTarget(target);
    } catch {
      setCopiedTarget(null);
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onLeaveRoom}>
        <ArrowLeft size={18} aria-hidden="true" />
        ออกจากห้อง
      </Button>

      <p className="min-w-0 truncate font-display text-lg text-lightBrown">
        สวัสดี <span className="font-semibold">{playerName}</span>
      </p>
      {isHost && (
        <span className="inline-flex items-center gap-1 rounded-full border-2 border-clayEdge bg-mediumBrown px-2.5 py-0.5 text-sm font-medium text-ink">
          <Crown size={14} aria-hidden="true" />
          Host
        </span>
      )}

      {/* รหัสห้อง + คัดลอกรหัส/ลิงก์ เอาไปส่งให้เพื่อน */}
      <div className="flex w-full items-center gap-1.5 rounded-2xl border-[3px] border-clayEdge bg-surface py-1 pl-4 pr-1.5 shadow-clay-sm sm:ml-auto sm:w-auto">
        <span className="text-sm text-muted">ห้อง</span>
        <span className="font-display text-xl font-medium tracking-[0.2em] text-mediumYellow">{roomId}</span>
        <span className="ml-auto flex gap-1 sm:ml-2">
          <IconButton variant="ghost" aria-label="คัดลอกรหัสห้อง" title="คัดลอกรหัสห้อง" onClick={() => handleCopy("code")}>
            {copiedTarget === "code" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          </IconButton>
          <IconButton variant="ghost" aria-label="คัดลอกลิงก์ห้อง" title="คัดลอกลิงก์ห้อง" onClick={() => handleCopy("link")}>
            {copiedTarget === "link" ? <Check size={18} aria-hidden="true" /> : <Link size={18} aria-hidden="true" />}
          </IconButton>
        </span>
        {/* แจ้งโปรแกรมอ่านหน้าจอว่าคัดลอกแล้ว */}
        <span role="status" aria-live="polite" className="sr-only">
          {copiedTarget === "code" ? "คัดลอกรหัสห้องแล้ว" : copiedTarget === "link" ? "คัดลอกลิงก์ห้องแล้ว" : ""}
        </span>
      </div>
    </header>
  );
};

export default RoomHeader;
