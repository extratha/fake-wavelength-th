import { emitRoomAction } from "@/lib/roomActions";
import { GameState } from "..";
import { Shuffle } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import Button from "@/component/Button";
import TeamScoreCard from "./TeamScoreCard";

type TeamManagementProps = {
  gameState: GameState;
  isHost: boolean;
  // ระบบนำทางไฮไลต์ปุ่ม "เริ่มรอบ" ให้ host (ยังไม่ได้เลือกทีมที่เล่น)
  isStartTurnHighlighted: boolean;
}
export type TeamKey = 'teamA' | 'teamB';

const TEAMS: TeamKey[] = ['teamA', 'teamB'];

// กระดานคะแนน 2 ทีม + ปุ่มสุ่มทีม (host)
const TeamManagement = ({ gameState, isHost, isStartTurnHighlighted }: TeamManagementProps) => {
  const { profile } = useUserProfile()

  const handleAdjustTeamScore = (type: '+' | "-", team: string) => {
    emitRoomAction('updateTeamScore', {
      roomId: gameState.roomId,
      team,
      score: 1,
      method: type,
    })
  }

  const handleSelectTeam = (team: TeamKey) => {
    emitRoomAction('userUpdateThierTeam', {
      roomId: gameState.roomId,
      userId: profile.userId,
      team,
    })
  }

  const handleStartTurnOfTeam = (team: TeamKey) => {
    emitRoomAction('setTurnOfTeam', {
      roomId: gameState.roomId,
      team,
    })
  }

  const handleRandomTeam = () => {
    emitRoomAction('randomizeTeam', { roomId: gameState.roomId })
  }

  const thisPlayerFromGameState = gameState.users.find((user) => user.userId === profile.userId)

  return (
    <div id="team-score" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {TEAMS.map((team) => (
          <TeamScoreCard
            key={team}
            team={team}
            score={gameState.scores?.[team] || 0}
            isTeamTurn={gameState.turn === team}
            isMyTeam={thisPlayerFromGameState?.team === team}
            isHost={isHost}
            isStartTurnHighlighted={isStartTurnHighlighted}
            onJoinTeam={() => handleSelectTeam(team)}
            onStartTurn={() => handleStartTurnOfTeam(team)}
            onAdjustScore={(method) => handleAdjustTeamScore(method, team)}
          />
        ))}
      </div>

      {isHost && (
        <Button variant="secondary" size="sm" className="self-center" onClick={handleRandomTeam}>
          <Shuffle size={16} aria-hidden="true" />
          สุ่มทีม
        </Button>
      )}
    </div>
  )
}

export default TeamManagement;
