'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { socket } from '@/lib/socket'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Modal, { ModalOptions } from '@/component/Modal'
import GameContent, { GameState } from './GameContent'

export default function MainScreen() {
  const { profile, profileReady } = useUserProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

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
    console.log('handle force left')
    router.back()
  }
   const handleGameStateUpdate = (state: GameState) => {
      setIsClueGiver(state.clueGiver === profile.userId)
    };

  useEffect(() => {
    if (!profileReady || !profile?.roomId || !profile?.userId) return ;

    // ✅ Emit joinRoom หลัง profile พร้อม
    socket.emit("joinRoom", {
      room: profile.roomId,
      userId: profile.userId,
      name: profile.userName,
    }, (response: { success: boolean; currentHostId?: string }) => {
      if (response.success) {
        console.log('join room ', profile.roomId)
        setIsHost(response.currentHostId === profile.userId);
      } else {
        console.log('join room failed')
        router.replace('/lobby?error=ไม่พบห้อง')
      }
    });

    // ✅ ตั้ง listener
    socket.on("newHost", handleNewHost);
    socket.on('forceLeftRoom', handleLeftRoom)
    socket.on("gameStateUpdate", handleGameStateUpdate);


    // ✅ Leave room ตอนปิดหน้า
    const leaveRoomOnUnload = () => {
      console.log('Leave room on On Unload')
      socket.emit("leaveRoom", {
        roomId: profile.roomId,
        userId: profile.userId,
      });
    };

    window.addEventListener("beforeunload", leaveRoomOnUnload);


    return () => {
      socket.off("newHost", handleNewHost);
      window.removeEventListener("beforeunload", leaveRoomOnUnload);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, profile]);

  if (!profileReady || !profile) return <div>กำลังโหลดข้อมูลผู้เล่น...</div>;

  const handleCloseModal = () => {
    setModalOptions(prev => ({ ...prev, open: false }));
  };

  return (
    <div className="p-6">
      {error === 'missingProfile' && (
        <div className="text-red-600 mb-4 font-semibold">
          โปรดระบุชื่อก่อนเข้าห้อง
        </div>
      )}

      <h1 className="text-xl font-semibold mb-2">
        สวัสดี {profile.userName} {isHost && "(Host)"}
      </h1>

      {isClueGiver ? (
        <div>คุณเป็น คนให้คำใบ้ !! 🎯</div>
      ) : (
        <div>รอคำใบ้...</div>
      )}

      <GameContent/>

      <Modal options={{ ...modalOptions, onClose: handleCloseModal }} />
    </div>
  )
}
