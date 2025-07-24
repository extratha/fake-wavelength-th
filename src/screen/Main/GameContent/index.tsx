"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { socket } from "@/lib/socket";
import PlayersPanel from "./PlayersPanel";
import WheelDial from "./WheelDial";
import TeamManagement, { TeamKey } from "./TeamManagement";

export type ScoreType = { teamA: number, teamB: number };

export type GameState = {
  roomId: string;
  clueGiver: string | null;
  scores: ScoreType;
  turn: TeamKey | null,
  promptPair: [string, string] | null;
  answerPosition: number | null;
  guessPosition: number | null;
  clue: string | null;
  teamA: string[];
  teamB: string[];
  users: { userId: string; name: string, team?: string }[];
  hostId: string;
  dialRotation: number;
  screenOpen: boolean;
  markerRotation: number;
};


const GameContent = () => {
  const { profile } = useUserProfile();
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const [gameState, setGameState] = useState<GameState | null>(null);

  const isHost = profile?.userId === gameState?.hostId;

  useEffect(() => {
    if (!profile?.userId) return;

    const handleGameStateUpdate = (state: GameState) => {
      console.log(state)
      setGameState(state);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [profile?.userId]);

  if (!gameState) return <p>Loading game...</p>;

  const clueGiverUser = gameState?.users?.find((user) => user.userId === gameState.clueGiver)
  const teamColor = (team?: TeamKey) => (team === 'teamA' ? 'text-teamA' : team === "teamB" ? 'text-teamB' : 'white')

  return (
    <div className="w-full block mt-4 " >
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <div >
          <h2>ห้อง: {roomId}</h2>
          <div >
            <p className="inline">ผู้ให้คำใบ้: </p>
            <p className={`inline font-medium ${teamColor(clueGiverUser?.team as TeamKey)}`}>
              {clueGiverUser?.name || ''}
            </p>
          </div>


          {gameState.clue && <p>คำใบ้: {gameState.clue}</p>}
          {gameState.promptPair && (
            <p>หัวข้อ: {gameState.promptPair[0]} ←→ {gameState.promptPair[1]}</p>
          )}

          {/* 🔄 แสดงหน้าปัด, ปุ่มใบ้, ปุ่มเดา ฯลฯ ตรงนี้ */}
        </div>
        <PlayersPanel users={gameState.users} hostId={gameState.hostId} isHost={isHost} clueGiver={gameState.clueGiver} />
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
