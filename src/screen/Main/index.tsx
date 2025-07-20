import { useUserProfile } from '@/hooks/useUserProfile'
import { socket } from '@/lib/socket'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Modal, { ModalOptions } from '@/component/Modal'

export default function MainScreen() {
  const { profile, profileReady } = useUserProfile()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const error = searchParams.get('error')

  const [isHost, setIsHost] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    open: false,
    message: "",
  });

  // ✅ ฟังก์ชันสำหรับรับ host ใหม่
  const handleNewHost = ({ userId }: { userId: string }) => {
    setIsHost(userId === profile?.userId);
  };
  const handleLeftRoom = () => {
    console.log('handle force left')
    router.back()
  }

  useEffect(() => {
    if (!profileReady || !profile?.roomId || !profile?.userId) return ;

    // ✅ Emit joinRoom หลัง profile พร้อม
    socket.emit("joinRoom", {
      room: profile.roomId,
      userId: profile.userId,
      name: profile.userName,
    }, (response: { success: boolean; currentHostId?: string }) => {
      if (response.success) {
        setIsHost(response.currentHostId === profile.userId);
      } else {
        console.log('join room failed')
        router.replace('/?error=ไม่พบห้อง')
      }
    });

    // ✅ ตั้ง listener
    socket.on("newHost", handleNewHost);
    socket.on('forceLeftRoom', handleLeftRoom)


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

      {profile.isClueGiver ? (
        <div>คุณเป็น Clue Giver 🎯</div>
      ) : (
        <div>รอคำใบ้...</div>
      )}

      <Modal options={{ ...modalOptions, onClose: handleCloseModal }} />
    </div>
  )
}
