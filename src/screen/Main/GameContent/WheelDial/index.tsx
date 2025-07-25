import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { socket } from "@/lib/socket";
import { GameState } from "..";
import { useUserProfile } from "@/hooks/useUserProfile";
import Image from "next/image";

// import ImageWheelScore from "../../../../../public/wheelBGnum.png";
// import ImageWheelScreen from "../../../../assets/wheelScreen.png";
// import ImageWheelDial from "../../../../assets/wheelDial.png";
// import ImageChromeBasic from "../../../../assets/chromeBasic.png";
import Modal from "@/component/Modal";
import WordCard from "./WordCard";
import { Eye, EyeClosed } from "lucide-react";

type WheelDialProps = {
  gameState: GameState;
};

const WheelDial = ({ gameState }: WheelDialProps) => {
  const { profile } = useUserProfile();

  const [modalOptions, setModalOptions] = useState({
    open: false,
  });
  const [isRenderWheelMarker, setIsRenderheelMarker] = useState(false);
  const [peekScreen, setIsPeekScreen] = useState(false);
  const [wheelHeight, setWheelHeight] = useState("");
  const wheelWrapRef = useRef<HTMLDivElement | null>(null);
  const wheelControl = useRef<HTMLDivElement | null>(null);

  const wheelScreen = document.getElementById("wheelScreen");
  const isClueGiver = gameState.clueGiver === profile.userId;
  const isHost = gameState.hostId === profile.userId;

  const rotateDial = (deg: number) => {
    if (deg > 0 && gameState.dialRotation >= 90) return;
    if (deg < 0 && gameState.dialRotation <= -90) return;

    const newRotation = gameState.dialRotation + deg;

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
    const randDeg = Math.floor(Math.random() * 180) - 90;
    socket.emit("randomizeMarker", {
      roomId: gameState.roomId,
      rotation: randDeg,
      userName: profile.userName,
    });
  };

  const handlePeekScreen = () => {
    setIsPeekScreen(!peekScreen);
  };

  useEffect(() => {
    if (wheelScreen) {
      setTimeout(() => {
        setIsRenderheelMarker(wheelScreen && wheelHeight ? true : false)
      }, 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelScreen])

  useEffect(() => {
    const updateHeight = () => {
      if (wheelWrapRef.current) {
        console.log(
          wheelWrapRef.current.clientHeight / 2,
          wheelWrapRef.current.clientWidth
        );
        if (wheelWrapRef.current.clientWidth > 250) {
          setWheelHeight(`${wheelWrapRef.current.clientHeight / 2}px`);
        } else {
          setWheelHeight('80%');
        }
      }
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <div className="relative w-full p2">
      <div
        id="wheelWrap"
        ref={wheelWrapRef}
        className="relative w-[calc(100%-60px)] max-w-[1200px] aspect-square mx-auto "
      >
        <div
          id="wheel"
          className="relative w-full overflow-hidden border-4 border-[#4b352a]"
          style={{
            height: wheelHeight,
          }}
        >
          {/* <div className="absolute left-0 top-[-8px] w-full h-3  bg-darkBrown"
            style={{ zIndex: 12 }}
          /> */}

          {/* Wheel Frame */}
          <div
            className="absolute left-0  w-full"
            style={{
              zIndex: 11,
            }}
          >
            <Image
              src={
                "https://res.cloudinary.com/dpya79wdj/image/upload/v1753419058/chromeBasic_dvojai.png"
              }
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
            ></Image>
          </div>
          {/* <div id="hider" ref={wheelWrapRef} className="absolute bottom-[-2px] left-0 w-full h-[5px] bg-darkBrown "
            style={{ transform: 'translateY(-1px)', zIndex: 11 }}
          /> */}

          {/* Wheel Screen */}
          <div
            id="wheelScreen"
            className={clsx(
              "absolute left-0 w-full  transition-transform duration-[3000ms]  ",
              gameState?.screenOpen ? "rotate-[180deg]" : "rotate-0",
              peekScreen ? "opacity-0" : ""
            )}
            style={{ zIndex: 5, }}
          >
            <Image
              src={
                "https://res.cloudinary.com/dpya79wdj/image/upload/v1753419059/wheelScreen_nttzdb.png"
              }
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
            ></Image>
          </div>

          {/* Wheel Marker */}
          {isRenderWheelMarker && (
            <div
              className="absolute top-0 left-0 w-full  p-1 flex items-center justify-center z-1 scale-[0.8]"
              style={{
                transform: `rotate(${gameState.markerRotation}deg)`,
                zIndex: 1,
              }}
            >
              {
                !gameState?.screenOpen && !isClueGiver ?
                  <Image
                    src={
                      "https://res.cloudinary.com/dpya79wdj/image/upload/v1753455560/wheelBGnum_hide_fempdb.png"
                    }
                    alt=""
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-auto"
                  /> : <Image
                    src={
                      "https://res.cloudinary.com/dpya79wdj/image/upload/v1753418311/wheelBGnum_rcrfvd.png"
                    }
                    alt=""
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-auto"
                  />
              }

            </div>
          )}

          {/* Wheel Dial */}
          <div
            className="absolute top-0 left-0 w-full z-10 transition-transform duration-300 "
            style={{
              transform: `rotate(${gameState.dialRotation}deg)`,
              scale: 2,
            }}
          >
            <Image
              src={
                "https://res.cloudinary.com/dpya79wdj/image/upload/v1753419058/wheelDial_xpfqxq.png"
              }
              alt=""
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
            ></Image>
          </div>
        </div>

        {/* Controls */}
        <div ref={wheelControl} className=" w-full z-20 left-0 sm:mt-10 mx-auto" >
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
            {(isClueGiver) &&
              <button onClick={randomizeMarker} className="h-10 px-3 py-1 bg-lightBrown rounded-lg max-w-40 font-medium ">สุ่มหมุนคะแนน </button>

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
