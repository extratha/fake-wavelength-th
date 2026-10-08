"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import WheelDial from "./WheelDial";
import clsx from "clsx";
import TeamManagement, { TeamKey } from "./TeamManagement";
import { TEAM_BORDER_CLASS, TEAM_LABEL, TEAM_TEXT_CLASS } from "../teamStyles";
import type { LeftRightGuess, RoundResult } from "@/server/game/scoring";

export type PairWord = {
  words: [string, string];
  used: boolean;
};

export type ScoreType = { teamA: number, teamB: number };

export type GameState = {
  roomId: string;
  clueGiver: string | null;
  scores: ScoreType;
  turn: TeamKey | null,
  clue: string;
  pairWords: PairWord | null;
  teamA: string[];
  teamB: string[];
  users: { userId: string; name: string, team?: string }[];
  hostId: string;
  dialRotation: number;
  screenOpen: boolean;
  // null = ยังไม่มีสิทธิ์เห็นตำแหน่งเป้า (server ไม่ส่งมา)
  markerRotation: number | null;
  disableRandomMaker: boolean;
  // ---------- รอบการเล่น / การคิดคะแนน (ดูกฎใน src/server/game/scoring.ts) ----------
  leftRightGuess: LeftRightGuess | null;
  isRoundLocked: boolean;
  isTargetSet: boolean;
  roundNumber: number;
  roundResult: RoundResult | null;
  winner: TeamKey | null;
};

type GameContentProps = {
  gameState: GameState
}

const GameContent = ({gameState}: GameContentProps) => {
  const { profile } = useUserProfile();

  const isHost = profile?.userId === gameState?.hostId;

  if (!gameState) return <p>Loading game...</p>;


  const turnTeam = gameState.turn;

  return (
    <div className="flex w-full flex-col gap-5">
      <TeamManagement gameState={gameState} isHost={isHost} />

      {/* กล่องหน้าปัด: ขอบเป็นสีของทีมที่กำลังเล่น (แทนขอบไล่สีเคลื่อนไหวแบบเดิม) */}
      <section
        aria-label="หน้าปัด"
        className={clsx(
          "rounded-[1.75rem] border-[3px] bg-surface px-3 pb-4 pt-3 shadow-clay transition-[border-color] duration-300 sm:px-5 sm:pb-5",
          turnTeam ? TEAM_BORDER_CLASS[turnTeam] : "border-clayEdge"
        )}
      >
        <p className="mb-3 text-center font-display text-base text-muted">
          {turnTeam ? (
            <>
              ตาของ <span className={clsx("font-semibold", TEAM_TEXT_CLASS[turnTeam])}>{TEAM_LABEL[turnTeam]}</span>
            </>
          ) : (
            "ยังไม่ได้เริ่มรอบ"
          )}
        </p>
        <WheelDial gameState={gameState} />
      </section>
    </div>
  );
};

export default GameContent;
