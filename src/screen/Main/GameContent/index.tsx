"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import WheelDial from "./WheelDial";
import TeamManagement, { TeamKey } from "./TeamManagement";

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
  markerRotation: number;
  disableRandomMaker: boolean;
  disableSubmitClue: boolean;
};

type GameContentProps = {
  gameState: GameState
}

const GameContent = ({gameState}: GameContentProps) => {
  const { profile } = useUserProfile();

  const isHost = profile?.userId === gameState?.hostId;

  if (!gameState) return <p>Loading game...</p>;


  return (
    <div className="w-full block mt-4 " >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        
      </div>

      <TeamManagement gameState={gameState} isHost={isHost} />

      <div
        className={`gradient-border w-full flex justify-center mt-[32px] p-2 
         ${gameState.turn === 'teamA'
            ? 'teamA-border-glow'
            : gameState.turn === 'teamB'
              ? 'teamB-border-glow'
              : ''
          }`
        }
      >
        <WheelDial gameState={gameState} />
      </div>
      <div>
      </div>
    </div>


  );
};

export default GameContent;
