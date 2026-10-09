import clsx from "clsx";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { emitRoomAction } from "@/lib/roomActions";
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

// ทีมตรงข้ามแทงว่าเป้า (โซน 4) อยู่ครึ่งซ้ายหรือครึ่งขวาของหน้าปัด (สลับได้จนกว่าจะเปิดหน้าปัด)
const LeftRightGuess = ({ gameState, myTeam, isHighlighted }: LeftRightGuessProps) => {
  const guessingTeam = gameState.turn;
  if (!guessingTeam) return null;

  const opposingTeam: TeamKey = guessingTeam === "teamA" ? "teamB" : "teamA";
  const isLocked = gameState.isRoundLocked || gameState.screenOpen;
  const canGuess = myTeam === opposingTeam && !isLocked;

  const handleGuess = (guess: LeftRightGuessValue) => {
    if (!canGuess) return;
    emitRoomAction("setLeftRightGuess", { roomId: gameState.roomId, guess });
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 rounded-clay border-2 border-clayEdge bg-surfaceDeep px-4 py-3">
      <p className="text-center text-sm text-lightBrown">
        <span className={clsx("font-semibold", TEAM_TEXT_CLASS[opposingTeam])}>{TEAM_LABEL[opposingTeam]}</span>{" "}
        แทงว่าเป้า (โซน 4) อยู่ครึ่งซ้ายหรือครึ่งขวาของหน้าปัด
        {isLocked && (
          <span className="ml-2 inline-flex items-center gap-1 text-muted">
            <Lock size={14} aria-hidden="true" /> ล็อกแล้ว
          </span>
        )}
      </p>

      {/* ทีมที่แทงได้เห็นปุ่ม คนอื่นเห็นแค่สถานะการแทง (สูงเท่าแถวปุ่ม จะได้ไม่กระตุกตอนสลับทีม) */}
      <div className="flex min-h-[44px] items-center justify-center">
        {canGuess ? (
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
                  className="min-w-[96px]"
                >
                  {option.value === "left" && <ChevronLeft size={18} aria-hidden="true" />}
                  {option.label}
                  {option.value === "right" && <ChevronRight size={18} aria-hidden="true" />}
                </Button>
              );
            })}
          </div>
        ) : (
          <GuessStatus opposingTeam={opposingTeam} guess={gameState.leftRightGuess} isLocked={isLocked} />
        )}
      </div>
    </div>
  );
};

type GuessStatusProps = {
  opposingTeam: TeamKey;
  guess: LeftRightGuessValue | null;
  isLocked: boolean;
};

// สถานะการแทงสำหรับคนที่กดแทงไม่ได้
const GuessStatus = ({ opposingTeam, guess, isLocked }: GuessStatusProps) => {
  if (!guess) {
    return (
      <p className="text-sm text-muted">
        {isLocked ? `${TEAM_LABEL[opposingTeam]} ไม่ได้แทง` : `รอ${TEAM_LABEL[opposingTeam]} แทง…`}
      </p>
    );
  }

  const guessLabel = GUESS_OPTIONS.find((option) => option.value === guess)?.label;
  return (
    <p className="flex items-center gap-1.5 text-base">
      <span className={clsx("font-semibold", TEAM_TEXT_CLASS[opposingTeam])}>{TEAM_LABEL[opposingTeam]}</span>
      แทง
      <span className="inline-flex items-center gap-0.5 font-semibold">
        {guess === "left" && <ChevronLeft size={18} aria-hidden="true" />}
        {guessLabel}
        {guess === "right" && <ChevronRight size={18} aria-hidden="true" />}
      </span>
    </p>
  );
};

export default LeftRightGuess;
