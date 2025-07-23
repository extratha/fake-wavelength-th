import { socket } from "@/lib/socket";
import { GameState } from "..";
import React from "react";
import { useUserProfile } from "@/hooks/useUserProfile";

type TeamManagementProps = {
  gameState: GameState;
  isHost: boolean;
}
export type TeamKey = 'teamA' | 'teamB';

const TeamManagement = ({ gameState, isHost }: TeamManagementProps) => {
  const { profile, updateProfile } = useUserProfile()

  type TeamScoreLabelType = Record<TeamKey, string>;
  const TEAM_SCORE_LABEL: TeamScoreLabelType = {
    teamA: 'TEAM A: ',
    teamB: 'TEAM B: '
  }

  const handleAdjustTeamScore = (type: '+' | "-", team: string) => {
    socket.emit('updateTeamScore', {
      roomId: gameState.roomId,
      team,
      score: 1,
      method: type,
    })
  }

  const handleSelectTeam = (team: TeamKey) => {
    socket.emit('userUpdateThierTeam', {
      roomId: gameState.roomId,
      userId: profile.userId,
      team,
    })
  }

  const handleStartTurnOfTeam = (team: TeamKey) => {
    socket.emit('setTurnOfTeam', {
      roomId: gameState.roomId,
      team,
    })
  }

  const handleRandomTeam = () => {
    socket.emit('randomizeTeam', { roomId: gameState.roomId })
  }

  const teamColor = (team: TeamKey) => (team === 'teamA' ? 'text-teamA' : 'text-teamB')

  const thisPlayerFromGameState = gameState.users.find((user) => user.userId === profile.userId)

  return (
    <React.Fragment>
      <div id="team-score" className="flex flex-row justify-between my-4 gap-4" >
        {gameState.scores && Object.keys(gameState.scores).map((team, index) => (
          <React.Fragment key={index}>
            <div id={team} className='flex flex-col'>
              <button className="p-2 bg-lightYellow text-darkBrown font-medium rounded-lg mb-4"
                style={{
                  visibility: !thisPlayerFromGameState?.team || thisPlayerFromGameState?.team !== team ? 'visible' : 'hidden'
                }}
                onClick={() => handleSelectTeam(team as TeamKey)}
              >
                {`เข้าร่วมทีม ${team === "teamA" ? "A" : "B"}`}
              </button>

              {isHost ? <button className="p-2 bg-lightYellow text-darkBrown font-medium rounded-lg"
                onClick={() => handleStartTurnOfTeam(team as TeamKey)}
              >
                {`เริ่มรอบของทีม ${team === "teamA" ? "A" : "B"}`}
              </button> : null
              }

              <div className="flex flex-row gap-2 items-center">
                <p className={`text-center font-bold text-[20px] ${teamColor(team as TeamKey)}`}
                >
                  {TEAM_SCORE_LABEL[team as TeamKey]}
                </p>
                <p className="text-center font-bold text-[32px]"> {gameState.scores[team as TeamKey] || 0}</p>
              </div>
              {
                isHost && <div className="flex flex-row gap-10 text-darkBrown justify-center">
                  <button className="rounded-[20px] bg-lightYellow w-10 h-10 p-2 text-[16px]" onClick={() => handleAdjustTeamScore('-', team)}>-</button>
                  <button className="rounded-[20px] bg-lightYellow w-10 h-10 p-2 text-[16px] font-medium" onClick={() => handleAdjustTeamScore('+', team)}>+</button>
                </div>
              }
            </div>
            {isHost && index === 0 &&
              <button className="p-2 w-14 h-14 rounded-[50px] bg-mediumBrown self-end font-medium"
                onClick={handleRandomTeam}
              >
                สุ่มทีม
              </button>}
          </React.Fragment>
        ))}
      </div>
    </React.Fragment>

  )
}

export default TeamManagement;