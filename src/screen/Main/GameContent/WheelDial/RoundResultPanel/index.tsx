import clsx from "clsx";
import { socket } from "@/lib/socket";
import { GameState } from "../..";
import { TeamKey } from "../../TeamManagement";

type RoundResultPanelProps = {
  gameState: GameState;
  isHost: boolean;
};

const TEAM_LABEL: Record<TeamKey, string> = { teamA: "ทีม A", teamB: "ทีม B" };
const TEAM_TEXT_COLOR: Record<TeamKey, string> = { teamA: "text-teamA", teamB: "text-teamB" };
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
    <div className="round-result-in w-full max-w-[420px] mx-auto mt-4 p-4 rounded-xl bg-playerHover text-white text-center flex flex-col gap-2">
      {winner && (
        <p className={clsx("text-[24px] font-bold", TEAM_TEXT_COLOR[winner])}>🏆 {TEAM_LABEL[winner]} ชนะ!</p>
      )}

      {roundResult ? (
        <>
          <p className="text-[18px]">
            <span className={clsx("font-bold", TEAM_TEXT_COLOR[roundResult.guessingTeam])}>
              {TEAM_LABEL[roundResult.guessingTeam]}
            </span>{" "}
            ได้ <span className="font-bold text-[22px]">+{roundResult.guessingTeamPoints}</span>
            {roundResult.guessingTeamPoints === 4 && " 🎯 เข้าเป้า!"}
            {roundResult.guessingTeamPoints === 0 && " (ไม่โดนโซน)"}
          </p>

          <p className="text-[15px] opacity-90">
            <span className={clsx("font-bold", TEAM_TEXT_COLOR[roundResult.opposingTeam])}>
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
            <p className="text-[14px] opacity-80">
              ตาต่อไป:{" "}
              <span className={clsx("font-bold", TEAM_TEXT_COLOR[roundResult.nextTurn])}>
                {TEAM_LABEL[roundResult.nextTurn]}
              </span>
              {roundResult.isCatchUpTurn && " (catch-up: เข้าเป้าแต่ยังตามหลัง ได้เล่นต่อ)"}
            </p>
          )}
        </>
      ) : (
        <p className="text-[14px] opacity-80">รอบนี้ไม่คิดคะแนน (ยังไม่ได้เลือกทีมที่เล่น หรือยังไม่ได้สุ่มเป้า)</p>
      )}

      {isHost && (
        <button
          onClick={winner ? handleStartNewGame : handleStartNextRound}
          className="mt-2 self-center h-10 px-4 rounded-lg bg-lightBrown text-darkBrown font-medium"
        >
          {winner ? "เริ่มเกมใหม่" : "เริ่มรอบถัดไป"}
        </button>
      )}
    </div>
  );
};

export default RoundResultPanel;
