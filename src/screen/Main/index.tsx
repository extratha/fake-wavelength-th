'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { socket } from '@/lib/socket'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal, { ModalOptions } from '@/component/Modal'
import GameContent, { GameState } from './GameContent'
import InputText from '@/component/InputText'
import PlayersPanel from './GameContent/PlayersPanel'
import { TeamKey } from './GameContent/TeamManagement'

export default function MainScreen() {
  const { profile, profileReady } = useUserProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const roomId = searchParams.get("room");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [clueInput, setClueInput] = useState('')

  const [isHost, setIsHost] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    open: false,
    message: "",
  });
  const [isClueGiver, setIsClueGiver] = useState(false)


  // ✅ ฟังก์ชันสำหรับรับ host ใหม่
  const handleNewHost = ({ userId }: { userId: string }) => {
    setIsHost(userId === profile?.userId);
  };
  const handleLeftRoom = () => {
    router.back()
  }
  const handleGameStateUpdate = (state: GameState) => {
    setIsClueGiver(state.clueGiver === profile.userId)
  };

  const handleCloseModal = () => {
    setModalOptions(prev => ({ ...prev, open: false }));
  };


  const submitClue = () => {
    socket.emit('submitClue', { roomId: gameState?.roomId, clue: clueInput });
  }

  useEffect(() => {
    if (!profile?.userId) return;

    const handleGameStateUpdate = (state: GameState) => {
      setGameState(state);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [profile?.userId]);

  useEffect(() => {
    if (!profile.userName) {
      router.replace('/lobby?error=กรุณาตั้งชื่อ')
      return
    }

    if (!profileReady || !profile?.userId) return;

    // ✅ Emit joinRoom หลัง profile พร้อม
    socket.emit("joinRoom", {
      roomId: profile.roomId,
      userId: profile.userId,
      name: profile.userName,
    }, (response: { success: boolean; currentHostId?: string }) => {
      if (response.success) {
        setIsHost(response.currentHostId === profile.userId);
      } else {
        router.replace('/lobby?error=ไม่พบห้อง')
      }
    });

    // ✅ ตั้ง listener
    socket.on("newHost", handleNewHost);
    socket.on('forceLeftRoom', handleLeftRoom)
    socket.on("gameStateUpdate", handleGameStateUpdate);


    // ✅ Leave room ตอนปิดหน้า
    const leaveRoomOnUnload = () => {
      socket.emit("leaveRoom", {
        roomId: profile.roomId,
        userId: profile.userId,
        name: profile.userName
      });
    };

    window.addEventListener("beforeunload", leaveRoomOnUnload);

    return () => {
      socket.off("newHost", handleNewHost);
      window.removeEventListener("beforeunload", leaveRoomOnUnload);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, profile]);

  useEffect(() => {
    const handleConnect = () => {
      console.log('Connected to server');
    };

    const handleConnectError = () => {
      router.replace("/lobby?error=การเชื่อมต่อกับ server ล้มเหลว")
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("newHost", handleNewHost);
      socket.off("forceLeftRoom", handleLeftRoom);
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (!profileReady || !profile) return <div>กำลังโหลดข้อมูลผู้เล่น...</div>;
  if (!gameState) return <p>กำลังโหลดข้อมูลเกม...</p>;

  const clueGiverUser = gameState?.users?.find((user) => user.userId === gameState.clueGiver)
  const teamColor = (team?: TeamKey) => (team === 'teamA' ? 'text-teamA' : team === "teamB" ? 'text-teamB' : 'white')


  return (
    <div className="p-6 h-full ">
      {error === 'missingProfile' && (
        <div className="text-red-600 mb-4 font-semibold">
          โปรดระบุชื่อก่อนเข้าห้อง
        </div>
      )}

      <h1 className="text-xl font-semibold mb-2">
        สวัสดี {profile.userName} {isHost && "(Host)"}
      </h1>

      <div className="flex justify-between">
        <div>
          <div >
            <h2>ห้อง: {roomId}</h2>
            <div >
              <p className="inline">ผู้ให้คำใบ้: </p>
              <p className={`inline font-medium ${teamColor(clueGiverUser?.team as TeamKey)}`}>
                {clueGiverUser?.name || ''}
              </p>
            </div>


            {/* 🔄 แสดงหน้าปัด, ปุ่มใบ้, ปุ่มเดา ฯลฯ ตรงนี้ */}
          </div>
          {isClueGiver ? (
            <div className="flex flex-col gap-2 max-w-[180px]" >
              <p>
                คุณเป็น คนให้คำใบ้ !! 🎯
              </p>
              <InputText onChange={(event) => setClueInput(event.target.value)} />
              <button
                className={`mt-2 p-2 w-[100px] rounded-[6px] 
                  font-medium
                  ${gameState.disableSubmitClue ? 'bg-gray-400 text-white cursor-default pointer-events-none' : 'bg-lightBrown text-darkBrown'}
                  `}
                onClick={submitClue}
              >
                ส่งคำใบ้
              </button>
            </div>
          ) : (
            <div className="flex gap-2">คำใบ้คือ:
              <p className="font-medium">{gameState?.clue}</p>
            </div>

          )}

        </div>

        <PlayersPanel users={gameState.users} hostId={gameState.hostId} isHost={isHost} clueGiver={gameState.clueGiver} />
      </div>


      <GameContent gameState={gameState} />

      <Modal options={{ ...modalOptions, onClose: handleCloseModal }} />
    </div>
  )
}
