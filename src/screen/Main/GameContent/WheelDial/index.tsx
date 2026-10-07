import debounce from "lodash.debounce";
import { useEffect, useMemo, useState } from "react";
import { socket } from "@/lib/socket";
import { GameState } from "..";
import { useUserProfile } from "@/hooks/useUserProfile";

// import ImageWheelScore from "../../../../../public/wheelBGnum.png";
// import ImageWheelScreen from "../../../../assets/wheelScreen.png";
// import ImageWheelDial from "../../../../assets/wheelDial.png";
// import ImageChromeBasic from "../../../../assets/chromeBasic.png";
import Modal from "@/component/Modal";
import WordCard from "./WordCard";
// หน้าปัดใช้ SVG แล้ว (เวอร์ชัน PNG เดิมเก็บไว้ที่ ./WheelPng แต่ไม่ได้ import เพื่อไม่ต้องโหลดรูป)
import WheelSvg from "./WheelSvg";
import { Eye, EyeClosed } from "lucide-react";

type WheelDialProps = {
  gameState: GameState;
};

const WheelDial = ({ gameState }: WheelDialProps) => {
  const { profile } = useUserProfile();

  const [modalOptions, setModalOptions] = useState({
    open: false,
  });
  const [peekScreen, setIsPeekScreen] = useState(false);

  const isClueGiver = gameState.clueGiver === profile.userId;
  const isHost = gameState.hostId === profile.userId;

  // ---------- ลากหมุนเข็ม ----------
  // ระหว่างลาก แสดงค่าในเครื่องตัวเองทันที (ไม่ต้องรอ server) แล้วค่อยส่งค่าไป server เป็นระยะ
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [localDialRotation, setLocalDialRotation] = useState<number | null>(null);

  // debounce + maxWait = throttle: ส่งไม่เกินทุก 60ms ระหว่างลาก ให้คนอื่นเห็นเข็มขยับตาม
  const emitDialRotationThrottled = useMemo(
    () =>
      debounce(
        (roomId: string, rotation: number, userName: string) => {
          socket.emit("updateDialRotation", { roomId, rotation, userName });
        },
        60,
        { maxWait: 60 }
      ),
    []
  );

  useEffect(() => {
    return () => emitDialRotationThrottled.cancel();
  }, [emitDialRotationThrottled]);

  // ปล่อยนิ้วแล้ว: เลิกใช้ค่าในเครื่องเมื่อ server ส่งค่าเดียวกันกลับมา (กันเข็มเด้งกลับไปค่าเก่าชั่วขณะ)
  useEffect(() => {
    if (isDraggingDial || localDialRotation === null) return;
    if (gameState.dialRotation === localDialRotation) {
      setLocalDialRotation(null);
      return;
    }
    // กันค้าง: ถ้ามีคนอื่นหมุนแทรกจนค่าไม่ตรง ก็กลับไปใช้ค่าจาก server หลังจากนี้
    const fallbackTimer = setTimeout(() => setLocalDialRotation(null), 1000);
    return () => clearTimeout(fallbackTimer);
  }, [isDraggingDial, localDialRotation, gameState.dialRotation]);

  const handleDialDragStart = () => {
    setIsDraggingDial(true);
  };

  const handleDialDrag = (rotation: number) => {
    setLocalDialRotation(rotation);
    emitDialRotationThrottled(gameState.roomId, rotation, profile.userName);
  };

  const handleDialDragEnd = (rotation: number) => {
    setLocalDialRotation(rotation);
    setIsDraggingDial(false);
    // ส่งค่าสุดท้ายทันที ไม่ต้องรอรอบ throttle
    emitDialRotationThrottled.cancel();
    socket.emit("updateDialRotation", {
      roomId: gameState.roomId,
      rotation,
      userName: profile.userName,
    });
  };

  const displayedDialRotation = localDialRotation ?? gameState.dialRotation;


  const rotateDial = (deg: number) => {
    if (deg > 0 && gameState.dialRotation >= 90) return;
    if (deg < 0 && gameState.dialRotation <= -90) return;

    // clamp ไว้ในช่วง -90 ถึง 90 กันกรณีเช่นอยู่ที่ 85 แล้วกด +10 เป็น 95
    const newRotation = Math.min(90, Math.max(-90, gameState.dialRotation + deg));

    socket.emit("updateDialRotation", {
      roomId: gameState.roomId,
      rotation: newRotation,
      userName: profile.userName,
    });
  };

  const toggleScreen = () => {
    if (gameState.screenOpen) {
      socket.emit("toggleScreen", {
        roomId: gameState.roomId,
        screenOpen: false,
        userName: profile.userName,
      });
      return;
    }
    setModalOptions({
      open: true,
    });
  };

  const handleConfirmToggleScreen = () => {
    socket.emit("toggleScreen", {
      roomId: gameState.roomId,
      screenOpen: true,
      userName: profile.userName,
    });

    setModalOptions({
      open: false,
    });
  };

  const randomizeMarker = () => {
    // server เป็นคนสุ่มตำแหน่งเป้า (ไม่ส่งค่าจาก client เพื่อกันโกง)
    socket.emit("randomizeMarker", {
      roomId: gameState.roomId,
      userName: profile.userName,
    });
    socket.emit('setDisableRandomMaker', {
      roomId : gameState.roomId
    })
  };


  const handlePeekScreen = () => {
    setIsPeekScreen(!peekScreen);
  };

  return (
    <div className="relative w-full p2">
      <div
        id="wheelWrap"
        className="relative w-[calc(100%-60px)] max-w-[1200px] aspect-square mx-auto "
      >
        <div id="wheelSvg" className="relative w-full overflow-hidden border-4 border-[#4b352a]">
          <WheelSvg
            dialRotation={displayedDialRotation}
            markerRotation={gameState.markerRotation}
            screenOpen={gameState.screenOpen}
            showScoreZones={gameState.screenOpen || isClueGiver}
            peekScreen={peekScreen}
            isDraggingDial={isDraggingDial}
            onDialDragStart={handleDialDragStart}
            onDialDrag={handleDialDrag}
            onDialDragEnd={handleDialDragEnd}
          />
        </div>

        {/* Controls */}
        <div className=" w-full z-20 left-0 sm:mt-10 mx-auto" >
          {
            isClueGiver && <div className="w-full  top-[50%] left-[-36%] sm:left-0 mx-auto flex justify-center z-50">
              <button onClick={handlePeekScreen} className="w-14 h-14  px-3 py-1 bg-lightBrown rounded-[300px] text-darkBrown font-medium justify-items-center">
                {peekScreen ? <EyeClosed /> : <Eye />}
              </button>
            </div>
          }


          <WordCard gameState={gameState} isHost={isHost} isClueGiver={isClueGiver} />

          <div
            className="w-full flex flex-col sm:flex-row justify-center items-center bottom-[100px] left-0 p-5 gap-6 sm:gap-3 mx-auto text-darkBrown"
            style={{ zIndex: "10" }}
          >
            {(isHost || isClueGiver) &&
              <button  
              onClick={randomizeMarker} 
              disabled={gameState.disableRandomMaker} 
              className={`h-10 px-3 py-1 ${gameState.disableRandomMaker ? 'bg-gray-400 text-white cursor-default pointer-events-none' : 'bg-lightBrown'} 
              rounded-lg max-w-40 font-medium`}>
                สุ่มหมุนคะแนน 
                </button>

            }
            <div className="flex gap-2 items-center">
              <button onClick={() => rotateDial(-10)} className="w-10 h-10 px-3 py-1 bg-lightBrown rounded-[50px]">-</button>
              <button onClick={() => rotateDial(-1)} className="w-8 h-8 px-3 py-1 bg-lightBrown rounded-[50px]">-</button>
              <button onClick={() => rotateDial(1)} className="w-8 h-8 px-3 py-1 bg-lightBrown rounded-[50px] font-medium">+</button>
              <button onClick={() => rotateDial(10)} className="w-10 h-10 px-3 py-1 bg-lightBrown rounded-[50px] font-medium">+</button>
            </div>

            {(isClueGiver || isHost) && (
              <button
                onClick={toggleScreen}
                className={`animated-border-button ${gameState.screenOpen ? "opened" : ""}
                 h-10 px-3 py-1 max-w-40 font-medium text-white`}
              >
                <p>
                  {gameState?.screenOpen ? "ซ่อนคะแนน" : "เปิดคะแนนให้ทุกคน"}
                </p>
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal options={modalOptions}>
        <div>
          <p className="text-[20px] font-medium text-center">
            ยืนยันเปิดคะแนนหรือไม่
          </p>
          <div className="flex flex-row justify-between mt-4">
            <button
              className="w-20 rounded-lg bg-darkBrown text-white p-2"
              onClick={handleConfirmToggleScreen}
            >
              ยืนยัน
            </button>
            <button
              className="w-20 rounded-lg bg-darkBrown text-white p-2 "
              onClick={() => {
                setModalOptions({
                  open: false,
                });
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WheelDial;
