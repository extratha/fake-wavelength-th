import clsx from "clsx";
import { Crown, Target } from "lucide-react";
import type { ChatMessage } from "@/server/game/chat";
import { TEAM_TEXT_CLASS, isTeamKey } from "../../teamStyles";

type ChatMessageItemProps = {
  message: ChatMessage;
  isMine: boolean;
  // ข้อมูลล่าสุดของคนส่ง (ทีม / host / คนให้คำใบ้) ถ้ายังอยู่ในห้อง
  senderTeam?: string;
  isSenderHost: boolean;
  isSenderClueGiver: boolean;
};

const formatTime = (sentAt: number) =>
  new Date(sentAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

// ข้อความ 1 รายการ: ข้อความระบบอยู่กลาง ตัวเล็กสีจาง / ข้อความของเราชิดขวา / ของคนอื่นชิดซ้าย
const ChatMessageItem = ({ message, isMine, senderTeam, isSenderHost, isSenderClueGiver }: ChatMessageItemProps) => {
  if (message.type === "system") {
    return (
      <li className="px-2 py-0.5 text-center text-xs text-muted">
        {message.text}
      </li>
    );
  }

  return (
    <li className={clsx("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}>
      <div className="flex items-center gap-1 px-1 text-xs">
        <span
          className={clsx(
            "max-w-[160px] truncate font-display font-medium",
            isTeamKey(senderTeam) ? TEAM_TEXT_CLASS[senderTeam] : "text-lightBrown"
          )}
        >
          {isMine ? "คุณ" : message.name}
        </span>
        {isSenderHost && (
          <>
            <Crown size={12} aria-hidden="true" className="text-mediumBrown" />
            <span className="sr-only">(Host)</span>
          </>
        )}
        {isSenderClueGiver && (
          <>
            <Target size={12} aria-hidden="true" className="text-mediumYellow" />
            <span className="sr-only">(คนให้คำใบ้)</span>
          </>
        )}
        <time dateTime={new Date(message.sentAt).toISOString()} className="font-sans text-muted tabular-nums">
          {formatTime(message.sentAt)}
        </time>
      </div>
      <p
        className={clsx(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border-2 px-3 py-1.5 text-sm",
          isMine
            ? "rounded-tr-md border-clayEdge bg-mediumYellow text-darkBrown"
            : "rounded-tl-md border-clayEdge bg-surfaceDeep text-lightBrown"
        )}
      >
        {message.text}
      </p>
    </li>
  );
};

export default ChatMessageItem;
