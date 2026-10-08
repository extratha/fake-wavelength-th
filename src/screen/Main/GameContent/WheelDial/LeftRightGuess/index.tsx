import clsx from "clsx";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { socket } from "@/lib/socket";
import type { LeftRightGuess as LeftRightGuessValue } from "@/server/game/scoring";
import { GameState } from "../..";
import { TeamKey } from "../../TeamManagement";
import Button from "@/component/Button";
import { TEAM_LABEL, TEAM_TEXT_CLASS } from "../../../teamStyles";

type LeftRightGuessProps = {
  gameState: GameState;
  myTeam: TeamKey | null;
  // ระบบนำทางไฮไลต์ปุ่มแทง (ทีมตรงข้ามยังไม่ได้แทง)
  isHighlighted: boolean;
};

const GUESS_OPTIONS: { value: LeftRightGuessValue; label: string }[] = [
  { value: "left", label: "ซ้าย" },
  { value: "right", label: "ขวา" },
];

// ทีมตรงข้ามแทงว่าเป้าอยู่ซ้ายหรือขวาของเข็ม (สลับได้จนกว่าจะเปิดหน้าปัด)
const LeftRightGuess = ({ gameState, myTeam, isHighlighted }: LeftRightGuessProps) => {
  const guessingTeam = gameState.turn;
  if (!guessingTeam) return null;

  const opposingTeam: TeamKey = guessingTeam === "teamA" ? "teamB" : "teamA";
  const isLocked = gameState.isRoundLocked || gameState.screenOpen;
  const canGuess = myTeam === opposingTeam && !isLocked;

  const handleGuess = (guess: LeftRightGuessValue) => {
    if (!canGuess) return;
    socket.emit("setLeftRightGuess", { roomId: gameState.roomId, guess });
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-clay border-2 border-clayEdge bg-surfaceDeep px-4 py-3">
      <p className="text-center text-sm text-lightBrown">
        <span className={clsx("font-semibold", TEAM_TEXT_CLASS[opposingTeam])}>{TEAM_LABEL[opposingTeam]}</span>{" "}
        แทงว่าเป้าอยู่ซ้ายหรือขวาของเข็ม
        {isLocked && (
          <span className="ml-2 inline-flex items-center gap-1 text-muted">
            <Lock size={14} aria-hidden="true" /> ล็อกแล้ว
          </span>
        )}
      </p>

      <div
        role="group"
        aria-label="แทงซ้ายหรือขวา"
        className={clsx("flex gap-3 rounded-clay", isHighlighted && "guide-highlight")}
      >
        {GUESS_OPTIONS.map((option) => {
          const isSelected = gameState.leftRightGuess === option.value;
          return (
            <Button
              key={option.value}
              size="sm"
              variant={isSelected ? opposingTeam : "secondary"}
              aria-pressed={isSelected}
              onClick={() => handleGuess(option.value)}
              disabled={!canGuess}
              // คำแทงที่เลือกไว้ยังต้องเห็นชัดแม้ปุ่มถูกล็อก
              className={clsx("min-w-[96px]", isSelected && "disabled:opacity-100")}
            >
              {option.value === "left" && <ChevronLeft size={18} aria-hidden="true" />}
              {option.label}
              {option.value === "right" && <ChevronRight size={18} aria-hidden="true" />}
            </Button>
          );
        })}
      </div>

      {myTeam !== opposingTeam && !isLocked && (
        <p className="text-sm text-muted">เฉพาะ{TEAM_LABEL[opposingTeam]} เท่านั้นที่กดแทงได้</p>
      )}
    </div>
  );
};

export default LeftRightGuess;
