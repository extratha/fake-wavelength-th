import clsx from "clsx";
import { Check, Minus, Play, Plus } from "lucide-react";
import Button from "@/component/Button";
import IconButton from "@/component/IconButton";
import type { TeamKey } from "..";
import { TEAM_BORDER_CLASS, TEAM_DOT_CLASS, TEAM_LABEL, TEAM_TEXT_CLASS } from "../../../teamStyles";

type TeamScoreCardProps = {
  team: TeamKey;
  score: number;
  isTeamTurn: boolean;
  isMyTeam: boolean;
  isHost: boolean;
  onJoinTeam: () => void;
  onStartTurn: () => void;
  onAdjustScore: (method: "+" | "-") => void;
};

// การ์ดคะแนนของ 1 ทีม: คะแนน, ปุ่มเข้าทีม และปุ่มของ host (เริ่มรอบ / ปรับคะแนน)
const TeamScoreCard = ({
  team,
  score,
  isTeamTurn,
  isMyTeam,
  isHost,
  onJoinTeam,
  onStartTurn,
  onAdjustScore,
}: TeamScoreCardProps) => {
  const teamLabel = TEAM_LABEL[team];

  return (
    <section
      aria-label={`คะแนน${teamLabel}`}
      className={clsx(
        "flex flex-col gap-3 rounded-[1.75rem] border-[3px] bg-surface p-3 shadow-clay transition-[border-color,box-shadow] duration-300 sm:p-4",
        // ทีมที่ได้ตาเล่น: ขอบสีทีม (แทนขอบไล่สีเคลื่อนไหวแบบเดิม)
        isTeamTurn ? TEAM_BORDER_CLASS[team] : "border-clayEdge"
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={clsx("h-3 w-3 shrink-0 rounded-full", TEAM_DOT_CLASS[team])} />
        <h2 className={clsx("text-lg font-semibold", TEAM_TEXT_CLASS[team])}>{teamLabel}</h2>
        {isTeamTurn && (
          <span className={clsx("ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink", TEAM_DOT_CLASS[team])}>
            ตานี้
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {isHost && (
          <IconButton aria-label={`ลดคะแนน${teamLabel}`} onClick={() => onAdjustScore("-")}>
            <Minus size={18} aria-hidden="true" />
          </IconButton>
        )}
        {/* ตัวเลขใช้ฟอนต์เนื้อความ: เลข 0 ของ Mitr มีขีดเฉียงดูเหมือน Ø */}
        <p className="min-w-[3ch] text-center font-sans text-5xl font-bold tabular-nums text-lightBrown">
          {/* key เปลี่ยนตามคะแนน ทำให้ animation เด้งเล่นใหม่ทุกครั้งที่คะแนนเปลี่ยน */}
          <span key={score} className="score-pop">
            {score}
          </span>
        </p>
        {isHost && (
          <IconButton aria-label={`เพิ่มคะแนน${teamLabel}`} onClick={() => onAdjustScore("+")}>
            <Plus size={18} aria-hidden="true" />
          </IconButton>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {isMyTeam ? (
          <p className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-clay border-2 border-dashed border-clayEdge text-sm text-muted">
            <Check size={16} aria-hidden="true" />
            คุณอยู่ทีมนี้
          </p>
        ) : (
          <Button variant={team} size="sm" fullWidth onClick={onJoinTeam}>
            เข้าร่วม{teamLabel}
          </Button>
        )}
        {isHost && (
          <Button variant="ghost" size="sm" fullWidth onClick={onStartTurn}>
            <Play size={16} aria-hidden="true" />
            เริ่มรอบของ{teamLabel}
          </Button>
        )}
      </div>
    </section>
  );
};

export default TeamScoreCard;
