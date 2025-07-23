"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { socket } from "@/lib/socket";
import Image from "next/image";
import ChevronUp from '@/assets/chevron-up.svg';
import ChevronDown from '@/assets/chevron-down.svg'
import {  useState } from "react";

type Player = {
  userId: string;
  name: string;
};

type PlayersProps = {
  users: { userId: string; name: string }[];
  hostId: string;
  isHost: boolean;
  clueGiver: string|null;
}

const PlayersPanel = ({ users, hostId, isHost, clueGiver }: PlayersProps) => {
  const { profile } = useUserProfile();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [expandPlayers, setExpandPlayers] = useState(false)

  const handleOption = (action: "clueGiver" | "kick") => {
    if (!selectedPlayer || !profile?.roomId) return;

    if (action === "clueGiver") {
      socket.emit("assignClueGiver", {
        roomId: profile.roomId,
        userId: selectedPlayer.userId,
      });
    }

    if (action === "kick") {
      socket.emit("kickUser", {
        roomId: profile.roomId,
        userId: selectedPlayer.userId,
      });
    }

    setSelectedPlayer(null);
  };

  const handleClickPlayer = (player: Player) => {
    if (!selectedPlayer && isHost) {
      setSelectedPlayer(player)
      return
    }
    setSelectedPlayer(null)

  }

  if (!users) return <div>กำลังโหลดผู้เล่น</div>

  return (
    <div className="w-[233px] h-fit ml-6 flex flex-col space-y-2 p-2 rounded-md border-4 border-double border-gray-300" >
      <div
        className="flex cursor-pointer justify-between"
        onClick={() => setExpandPlayers(!expandPlayers)}
      >
        <h3
          className="font-bold "
        >
          ผู้เล่น {users.length} คน 
        </h3>
        {
          expandPlayers ? <Image src={ChevronUp} alt="" style={{ color: 'white' }} /> : <Image src={ChevronDown} alt="" />
        }
      </div>

      {expandPlayers &&
        <>
          {users.map((player, index) => (
            <div key={index}>
              <div className={`rounded ${player.userId === selectedPlayer?.userId ? 'bg-playerHover' : ''}`}>
                <button
                  onClick={() => handleClickPlayer(player)}
                  style={{ cursor: 'poniter', wordWrap: 'break-word' }}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-playerHover ${player.userId === profile?.userId ? "font-medium" : ""}
                  
                  `}
                >
                  {player.name}{" "}
                  {player.userId === profile?.userId && <span className="mr-1">(คุณ)</span>}
                  {hostId === player.userId && <span className="mr-1">(Host)</span>}
                  {clueGiver && (clueGiver === player.userId) && '🎯' }
                </button>
                {isHost && selectedPlayer && selectedPlayer.userId === player.userId && (
                  <div className=" p-2 border-t shadow ">
                    <p className="font-[12px] font-medium mb-2 text-white" style={{ wordWrap: 'break-word' }} >
                      จัดการ:
                    </p>
                    <button
                      onClick={() => handleOption("clueGiver")}
                      className="text-[14px] block w-full text-left px-3 py-1 hover:bg-palyerHover text-white"
                    >
                      🎯 กำหนดเป็นคนให้คำใบ้
                    </button>
                    {player.userId !== hostId && <button
                      onClick={() => handleOption("kick")}
                      className="text-[14px] block w-full text-left px-3 py-1 hover:bg-palyerHover text-white"
                    >
                      ❌ เตะออกจากห้อง
                    </button>}

                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="mt-2 text-sm text-white underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>

            </div>

          ))}
        </>
      }



    </div>
  );
};

export default PlayersPanel;
