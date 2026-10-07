import clsx from "clsx";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { socket } from "@/lib/socket";
import type { LeftRightGuess as LeftRightGuessValue } from "@/server/game/scoring";
import { GameState } from "../..";
import { TeamKey } from "../../TeamManagement";

type LeftRightGuessProps = {
  gameState: GameState;
  myTeam: TeamKey | null;
};

const TEAM_LABEL: Record<TeamKey, string> = { teamA: "ทีม A", teamB: "ทีม B" };

const GUESS_OPTIONS: { value: LeftRightGuessValue; label: string }[] = [
  { value: "left", label: "ซ้าย" },
  { value: "right", label: "ขวา" },
];

// ทีมตรงข้ามแทงว่าเป้าอยู่ซ้ายหรือขวาของเข็ม (สลับได้จนกว่าจะเปิดหน้าปัด)
const LeftRightGuess = ({ gameState, myTeam }: LeftRightGuessProps) => {
  const guessingTeam = gameState.turn;
  if (!guessingTeam) return null;

  const opposingTeam: TeamKey = guessingTeam === "teamA" ? "teamB" : "teamA";
  const isLocked = gameState.isRoundLocked || gameState.screenOpen;
  const canGuess = myTeam === opposingTeam && !isLocked;

  const handleGuess = (guess: LeftRightGuessValue) => {
    if (!canGuess) return;
    socket.emit("setLeftRightGuess", { roomId: gameState.roomId, guess });
  };

  const teamBgColor = opposingTeam === "teamA" ? "bg-teamA" : "bg-teamB";
  const teamTextColor = opposingTeam === "teamA" ? "text-teamA" : "text-teamB";

  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      <p className="text-white text-[14px] text-center">
        <span className={clsx("font-bold", teamTextColor)}>{TEAM_LABEL[opposingTeam]}</span>{" "}
        แทงว่าเป้าอยู่ซ้ายหรือขวาของเข็ม
        {isLocked && (
          <span className="inline-flex items-center gap-1 ml-2 opacity-80">
            <Lock size={14} /> ล็อกแล้ว
          </span>
        )}
      </p>

      <div className="flex gap-3">
        {GUESS_OPTIONS.map((option) => {
          const isSelected = gameState.leftRightGuess === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleGuess(option.value)}
              disabled={!canGuess}
              className={clsx(
                "flex items-center gap-1 h-10 px-4 rounded-lg font-medium transition-all duration-200",
                isSelected ? clsx(teamBgColor, "text-white scale-105") : "bg-lightBrown text-darkBrown",
                !canGuess && "cursor-default pointer-events-none",
                !canGuess && !isSelected && "opacity-50"
              )}
            >
              {option.value === "left" && <ChevronLeft size={18} />}
              {option.label}
              {option.value === "right" && <ChevronRight size={18} />}
            </button>
          );
        })}
      </div>

      {myTeam !== opposingTeam && !isLocked && (
        <p className="text-white text-[12px] opacity-60">เฉพาะ{TEAM_LABEL[opposingTeam]} เท่านั้นที่กดแทงได้</p>
      )}
    </div>
  );
};

export default LeftRightGuess;
