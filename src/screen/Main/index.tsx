"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { socket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Modal, { ModalOptions } from "@/component/Modal";
import FullScreenLoading from "@/component/FullScreenLoading";
import GameContent, { GameState } from "./GameContent";
import PlayersPanel from "./GameContent/PlayersPanel";
import RoomHeader from "./RoomHeader";
import ClueSection from "./ClueSection";
import ChatPanel from "./ChatPanel";

export default function MainScreen() {
  const { profile, profileReady, updateProfile } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const roomId = searchParams.get("room");
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [isHost, setIsHost] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    open: false,
    message: "",
  });
  const [isClueGiver, setIsClueGiver] = useState(false);

  // ✅ ฟังก์ชันสำหรับรับ host ใหม่
  const handleNewHost = ({ userId }: { userId: string }) => {
    setIsHost(userId === profile?.userId);
  };
  const handleLeftRoom = () => {
    // ใช้ replace ไป lobby ตรง ๆ แทน router.back() ที่อาจย้อนไปหน้าอื่นที่ไม่ใช่ lobby
    router.replace("/lobby?error=คุณถูกเชิญออกจากห้อง");
  };
  const handleGameStateUpdate = (state: GameState) => {
    setIsClueGiver(state.clueGiver === profile.userId);
  };

  const handleCloseModal = () => {
    setModalOptions((prev) => ({ ...prev, open: false }));
  };

  // กลับไป lobby = ออกจากห้อง (เข้าใหม่ได้จากรายชื่อห้อง แต่ต้องเลือกทีมใหม่ และไม่ได้ host คืน)
  const handleLeaveRoomToLobby = () => {
    socket.emit("leaveRoom", {
      roomId: profile.roomId,
      userId: profile.userId,
      name: profile.userName,
    });
    router.push("/lobby");
  };

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
      // ส่งเลขห้องกลับไปด้วย คนที่เปิดลิงก์ห้องครั้งแรกจะได้ไม่ต้องพิมพ์เลขห้องเอง
      const roomQuery = roomId ? `&room=${encodeURIComponent(roomId)}` : "";
      router.replace(`/lobby?error=กรุณาตั้งชื่อ${roomQuery}`);
      return;
    }

    if (!profileReady || !profile?.userId) return;

    // ให้ห้องใน URL เป็นหลัก (เช่นเปิดจากลิงก์ที่เพื่อนแชร์) แล้วอัปเดต profile ให้ตรงกัน
    // component อื่นใช้ profile.roomId อยู่ พอ profile เปลี่ยน effect นี้จะทำงานใหม่แล้วค่อย join
    if (roomId && roomId !== profile.roomId) {
      updateProfile({ roomId });
      return;
    }

    const joinCurrentRoom = () => {
      socket.emit(
        "joinRoom",
        {
          roomId: profile.roomId,
          userId: profile.userId,
          name: profile.userName,
        },
        (response: { success: boolean; currentHostId?: string }) => {
          if (response.success) {
            setIsHost(response.currentHostId === profile.userId);
          } else {
            router.replace("/lobby?error=ไม่พบห้อง");
          }
        },
      );
    };

    // ✅ Emit joinRoom หลัง profile พร้อม
    // ถ้ายังไม่ connect ให้รอ event "connect" ด้านล่างแทน (กัน join ซ้ำ 2 ครั้ง)
    if (socket.connected) {
      joinCurrentRoom();
    }
    // เน็ตหลุดแล้ว reconnect จะได้ socket ใหม่ที่ยังไม่อยู่ในห้อง ต้อง join ใหม่ทุกครั้งที่ connect
    socket.on("connect", joinCurrentRoom);

    // ✅ ตั้ง listener
    socket.on("newHost", handleNewHost);
    socket.on("forceLeftRoom", handleLeftRoom);
    socket.on("gameStateUpdate", handleGameStateUpdate);

    // ✅ Leave room ตอนปิดหน้า
    const leaveRoomOnUnload = () => {
      socket.emit("leaveRoom", {
        roomId: profile.roomId,
        userId: profile.userId,
        name: profile.userName,
      });
    };

    window.addEventListener("beforeunload", leaveRoomOnUnload);

    return () => {
      // ถอด listener ชุดเดียวกับที่ลงทะเบียนในรอบนี้ ไม่งั้น listener จะสะสมทุกครั้งที่ profile เปลี่ยน
      socket.off("connect", joinCurrentRoom);
      socket.off("newHost", handleNewHost);
      socket.off("forceLeftRoom", handleLeftRoom);
      socket.off("gameStateUpdate", handleGameStateUpdate);
      window.removeEventListener("beforeunload", leaveRoomOnUnload);
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, profile]);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected to server");
    };

    const handleConnectError = () => {
      router.replace("/lobby?error=การเชื่อมต่อกับ server ล้มเหลว");
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

  if (!profileReady || !profile || !gameState) return <FullScreenLoading />;

  return (
    <main className="min-h-screen px-4 pb-12 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        {error === "missingProfile" && (
          <p
            role="alert"
            className="mb-4 rounded-2xl border-2 border-teamB bg-teamB/15 px-4 py-2 font-medium text-teamBText"
          >
            โปรดระบุชื่อก่อนเข้าห้อง
          </p>
        )}

        {/* desktop: คอลัมน์ซ้าย = หัวห้อง + เกม / คอลัมน์ขวา (สูงเท่าจอ เริ่มจากบนสุด) = รายชื่อผู้เล่น + แชท
            มือถือ: หัวห้อง → รายชื่อผู้เล่น → เกม → แชท
            (ใช้ display: contents ให้ 2 กล่องในคอลัมน์ขวาไปเรียงลำดับกับส่วนอื่นบนมือถือได้) */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6">
          <div className="order-none lg:col-start-1 lg:row-start-1">
            <RoomHeader
              roomId={roomId ?? gameState.roomId}
              playerName={profile.userName}
              isHost={isHost}
              onLeaveRoom={handleLeaveRoomToLobby}
            />
          </div>

          <div className="contents lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex lg:h-[calc(100vh-2rem)] lg:flex-col lg:gap-5">
            <div className="order-1 lg:shrink-0">
              <PlayersPanel
                users={gameState.users}
                hostId={gameState.hostId}
                isHost={isHost}
                clueGiver={gameState.clueGiver}
                clueGiverSkipRequested={gameState.clueGiverSkipRequested}
              />
            </div>
            <ChatPanel
              gameState={gameState}
              myUserId={profile.userId ?? ""}
              isClueGiver={isClueGiver}
              className="order-3 h-[480px] lg:h-auto lg:min-h-[240px] lg:flex-1"
            />
          </div>

          <div className="order-2 flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
            <ClueSection gameState={gameState} isClueGiver={isClueGiver} />
            <GameContent gameState={gameState} />
          </div>
        </div>
      </div>

      <Modal options={{ ...modalOptions, onClose: handleCloseModal }} />
    </main>
  );
}
