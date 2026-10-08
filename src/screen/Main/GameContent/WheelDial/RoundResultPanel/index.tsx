import clsx from "clsx";
import { socket } from "@/lib/socket";
import { GameState } from "../..";
import { ArrowRight, RotateCcw, Target, Trophy } from "lucide-react";
import Button from "@/component/Button";
import { TEAM_LABEL, TEAM_TEXT_CLASS } from "../../../teamStyles";

type RoundResultPanelProps = {
  gameState: GameState;
  isHost: boolean;
};

const GUESS_LABEL = { left: "ซ้าย", right: "ขวา" };

// สรุปผลรอบหลังเปิดหน้าปัด + ปุ่มของ host สำหรับเริ่มรอบถัดไป / เกมใหม่
const RoundResultPanel = ({ gameState, isHost }: RoundResultPanelProps) => {
  const { roundResult, winner } = gameState;

  // เปิดหน้าปัดแล้วแต่รอบนี้ไม่มีการคิดคะแนน (ยังไม่เลือกทีม หรือยังไม่สุ่มเป้า)
  const isRevealWithoutScoring =
    gameState.isRoundLocked && !roundResult && !(gameState.turn && gameState.isTargetSet);

  if (!roundResult && !isRevealWithoutScoring) return null;

  const handleStartNextRound = () => {
    socket.emit("startNextRound", { roomId: gameState.roomId });
  };

  const handleStartNewGame = () => {
    socket.emit("startNewGame", { roomId: gameState.roomId });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="round-result-in mx-auto flex w-full max-w-[460px] flex-col gap-2 rounded-clay border-[3px] border-mediumYellow bg-surfaceDeep p-4 text-center text-lightBrown shadow-clay"
    >
      {winner && (
        <p className={clsx("flex items-center justify-center gap-2 font-display text-2xl font-semibold", TEAM_TEXT_CLASS[winner])}>
          <Trophy size={26} aria-hidden="true" className="text-mediumYellow" />
          {TEAM_LABEL[winner]} ชนะ!
        </p>
      )}

      {roundResult ? (
        <>
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 font-display text-lg">
            <span className={clsx("font-bold", TEAM_TEXT_CLASS[roundResult.guessingTeam])}>
              {TEAM_LABEL[roundResult.guessingTeam]}
            </span>{" "}
            ได้ <span className="font-sans text-2xl font-bold tabular-nums text-mediumYellow">+{roundResult.guessingTeamPoints}</span>
            {roundResult.guessingTeamPoints === 4 && (
              <span className="inline-flex items-center gap-1 text-mediumYellow">
                <Target size={18} aria-hidden="true" /> เข้าเป้า!
              </span>
            )}
            {roundResult.guessingTeamPoints === 0 && " (ไม่โดนโซน)"}
          </p>

          <p className="text-[15px]">
            <span className={clsx("font-bold", TEAM_TEXT_CLASS[roundResult.opposingTeam])}>
              {TEAM_LABEL[roundResult.opposingTeam]}
            </span>{" "}
            {roundResult.leftRightGuess ? (
              <>
                แทง{GUESS_LABEL[roundResult.leftRightGuess]}{" "}
                {roundResult.isLeftRightGuessCorrect ? "ถูก" : "ไม่ถูก"}
                {roundResult.isLeftRightGuessCorrect && roundResult.guessingTeamPoints === 4 && " (แต่อีกทีมเข้าเป้า ไม่ได้คะแนน)"}
                {" "}
                <span className="font-bold">+{roundResult.opposingTeamPoints}</span>
              </>
            ) : (
              "ไม่ได้แทงซ้าย/ขวา"
            )}
          </p>

          {!winner && (
            <p className="text-sm text-muted">
              ตาต่อไป:{" "}
              <span className={clsx("font-bold", TEAM_TEXT_CLASS[roundResult.nextTurn])}>
                {TEAM_LABEL[roundResult.nextTurn]}
              </span>
              {roundResult.isCatchUpTurn && " (catch-up: เข้าเป้าแต่ยังตามหลัง ได้เล่นต่อ)"}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted">รอบนี้ไม่คิดคะแนน (ยังไม่ได้เลือกทีมที่เล่น หรือยังไม่ได้สุ่มเป้า)</p>
      )}

      {isHost && (
        <Button className="mt-2 self-center" onClick={winner ? handleStartNewGame : handleStartNextRound}>
          {winner ? <RotateCcw size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          {winner ? "เริ่มเกมใหม่" : "เริ่มรอบถัดไป"}
        </Button>
      )}
    </div>
  );
};

export default RoundResultPanel;
