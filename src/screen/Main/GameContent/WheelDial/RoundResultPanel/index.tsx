import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import { GameState } from "../..";
import { ArrowRight, ChevronDown, ChevronUp, RotateCcw, Target, Trophy } from "lucide-react";
import Button from "@/component/Button";
import { TEAM_LABEL, TEAM_TEXT_CLASS } from "../../../teamStyles";

type RoundResultPanelProps = {
  gameState: GameState;
  isHost: boolean;
  // ระบบนำทางไฮไลต์ปุ่มเริ่มรอบถัดไป / เกมใหม่ ให้ host
  isNextRoundHighlighted: boolean;
};

const GUESS_LABEL = { left: "ซ้าย", right: "ขวา" };

// ความสูงของ popup ผลรอบ ใช้เว้นที่ด้านบนของหน้า popup จะได้ไม่บังหัวห้อง (ดู globals.css)
const SHEET_HEIGHT_CSS_VARIABLE = "--result-sheet-height";

// สรุปผลรอบหลังเปิดหน้าปัด: popup ลอยชิดขอบบนจอ ทุกคนเห็นแม้จะเลื่อนไปอยู่ที่แชท (ชิดบนจะได้ไม่ชนช่องพิมพ์แชท)
// คนที่ไม่ใช่ host พับขึ้น/เปิดดูได้ ส่วน host มีปุ่มเริ่มรอบถัดไป / เกมใหม่ (กดแล้ว popup ปิดเองเพราะรอบใหม่ล้างผลรอบ)
const RoundResultPanel = ({ gameState, isHost, isNextRoundHighlighted }: RoundResultPanelProps) => {
  const { roundResult, winner } = gameState;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const detailsId = useId();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // เปิดหน้าปัดแล้วแต่รอบนี้ไม่มีการคิดคะแนน (ยังไม่เลือกทีม หรือยังไม่หมุนโซนคะแนน)
  const isRevealWithoutScoring =
    gameState.isRoundLocked && !roundResult && !(gameState.turn && gameState.isTargetSet);
  const isShown = !!roundResult || isRevealWithoutScoring;
  // host พับไม่ได้ ต้องกดเริ่มรอบถัดไปเท่านั้น
  const canCollapse = !isHost;
  const isDetailsVisible = !canCollapse || !isCollapsed;

  // รอบใหม่: popup ของรอบถัดไปต้องเปิดเต็มเสมอ
  useEffect(() => {
    setIsCollapsed(false);
  }, [gameState.roundNumber]);

  // บอกความสูงของ popup ให้หน้าเว็บรู้ (เปลี่ยนตามการพับ/เปิด) และล้างค่าเมื่อ popup ปิด
  useLayoutEffect(() => {
    const sheetElement = sheetRef.current;
    if (!isShown || !sheetElement) return;

    const rootStyle = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      rootStyle.setProperty(SHEET_HEIGHT_CSS_VARIABLE, `${Math.ceil(entry.borderBoxSize[0].blockSize)}px`);
    });
    observer.observe(sheetElement);

    return () => {
      observer.disconnect();
      rootStyle.removeProperty(SHEET_HEIGHT_CSS_VARIABLE);
    };
  }, [isShown]);

  if (!isShown) return null;

  const handleStartNextRound = () => {
    socket.emit("startNextRound", { roomId: gameState.roomId });
  };

  const handleStartNewGame = () => {
    socket.emit("startNewGame", { roomId: gameState.roomId });
  };

  // ข้อความสั้น ๆ บนแถบตอนพับ
  const collapsedSummary = winner
    ? `${TEAM_LABEL[winner]} ชนะ!`
    : roundResult
      ? `${TEAM_LABEL[roundResult.guessingTeam]} ได้ +${roundResult.guessingTeamPoints}`
      : "รอบนี้ไม่คิดคะแนน";

  return (
    // ชั้นนอกเต็มความกว้างจอแต่ไม่รับการกด จะได้กดส่วนอื่นข้าง ๆ popup ได้ (บน desktop)
    <div ref={sheetRef} className="result-sheet-in pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
      <section
        aria-label="ผลรอบ"
        className="pointer-events-auto w-full max-w-[460px] rounded-clay border-[3px] border-mediumYellow bg-surfaceDeep text-lightBrown shadow-clay"
      >
        {isDetailsVisible && (
          <div
            id={detailsId}
            role="status"
            aria-live="polite"
            className="flex flex-col gap-2 p-4 text-center"
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
              <p className="text-sm text-muted">รอบนี้ไม่คิดคะแนน (ยังไม่ได้เลือกทีมที่เล่น หรือยังไม่ได้หมุนโซนคะแนน)</p>
            )}

            {isHost ? (
              <Button
                className={clsx("mt-2 self-center", isNextRoundHighlighted && "guide-highlight")}
                onClick={winner ? handleStartNewGame : handleStartNextRound}>
                {winner ? <RotateCcw size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                {winner ? "เริ่มเกมใหม่" : "เริ่มรอบถัดไป"}
              </Button>
            ) : (
              <button
                type="button"
                aria-expanded={true}
                aria-controls={detailsId}
                onClick={() => setIsCollapsed(true)}
                className="flex ml-auto shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-sm text-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60"
              >
                พับขึ้น
                <ChevronUp size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* ตอนพับ: เหลือแถบสรุปผลแถวเดียว กดเพื่อเปิดดูผลเต็ม */}
        {canCollapse && isCollapsed && (
          <button
            type="button"
            aria-expanded={false}
            aria-controls={detailsId}
            onClick={() => setIsCollapsed(false)}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-clay px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60"
          >
            <span className="min-w-0 truncate font-display text-base">ผลรอบ: {collapsedSummary}</span>
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
              ดูผลรอบ
              <ChevronDown size={18} aria-hidden="true" />
            </span>
          </button>
        )}
      </section>
    </div>
  );
};

export default RoundResultPanel;
