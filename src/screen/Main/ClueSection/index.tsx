import { useEffect, useState } from "react";
import clsx from "clsx";
import { MessageCircle, Target } from "lucide-react";
import { socket } from "@/lib/socket";
import Button from "@/component/Button";
import Card from "@/component/Card";
import InputText from "@/component/InputText";
import { GameState } from "../GameContent";
import { TEAM_TEXT_CLASS, isTeamKey } from "../teamStyles";

type ClueSectionProps = {
  gameState: GameState;
  isClueGiver: boolean;
};

const CLUE_MAX_LENGTH = 100;

// คำใบ้ของรอบนี้: คนให้คำใบ้พิมพ์/ส่งได้เรื่อย ๆ ส่วนคนอื่นเห็นคำใบ้ล่าสุด
const ClueSection = ({ gameState, isClueGiver }: ClueSectionProps) => {
  const [clueInput, setClueInput] = useState("");

  // เริ่มรอบใหม่ server ล้างคำใบ้แล้ว ช่องพิมพ์ก็ต้องล้างตาม ไม่งั้นคำใบ้รอบก่อนจะค้างในช่อง
  useEffect(() => {
    setClueInput("");
  }, [gameState.roundNumber]);

  // ส่งคำใบ้ได้ไม่จำกัดครั้ง คำใหม่จะแทนที่คำเดิมทันที
  const submitClue = () => {
    const trimmedClue = clueInput.trim();
    if (!trimmedClue) return;
    socket.emit("submitClue", { roomId: gameState.roomId, clue: trimmedClue });
  };

  const clueGiverUser = gameState.users.find((user) => user.userId === gameState.clueGiver);
  const clueGiverTeam = clueGiverUser?.team;

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-clayEdge bg-mediumYellow text-darkBrown shadow-clay-sm"
          >
            <MessageCircle size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted">
              คนให้คำใบ้:{" "}
              {clueGiverUser ? (
                <span className={clsx("font-semibold", isTeamKey(clueGiverTeam) ? TEAM_TEXT_CLASS[clueGiverTeam] : "text-lightBrown")}>
                  {clueGiverUser.name}
                </span>
              ) : (
                <span className="text-lightBrown">ยังไม่ได้เลือก</span>
              )}
            </p>
            {/* คำใบ้ล่าสุด: aria-live ให้โปรแกรมอ่านหน้าจออ่านเมื่อคำใบ้เปลี่ยน */}
            <p aria-live="polite" className={clsx("mt-0.5 break-words font-display text-2xl", gameState.clue ? "text-lightBrown" : "text-muted")}>
              {gameState.clue || "รอคำใบ้..."}
            </p>
          </div>
        </div>

        {isClueGiver && (
          <form
            className="flex w-full items-end gap-2 sm:w-auto sm:min-w-[320px]"
            onSubmit={(event) => {
              event.preventDefault();
              submitClue();
            }}
          >
            <div className="min-w-0 flex-1">
              <InputText
                label="คุณเป็นคนให้คำใบ้ พิมพ์คำใบ้ได้เลย"
                value={clueInput}
                maxLength={CLUE_MAX_LENGTH}
                placeholder="ส่งใหม่ได้เรื่อย ๆ"
                onChange={(event) => setClueInput(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!clueInput.trim()} className="shrink-0">
              <Target size={18} aria-hidden="true" />
              ส่ง
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};

export default ClueSection;
