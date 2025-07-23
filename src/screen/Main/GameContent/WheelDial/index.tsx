import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { socket } from '@/lib/socket'
import { GameState } from '..';
import { useUserProfile } from '@/hooks/useUserProfile';
import Image from 'next/image';

import ImageWheelScore from '@/assets/wheelBGnum.png'
import ImageWheelScreen from '@/assets/wheelScreen.png'
import ImageWheelDial from '@/assets/wheelDial.png'
import ImageChromeBasic from '@/assets/chromeBasic.png'
import Modal from '@/component/Modal';

type WheelDialProps = {
  gameState: GameState
}

const WheelDial = ({ gameState }: WheelDialProps) => {
  const { profile } = useUserProfile()

  const [modalOptions, setModalOptions] = useState({
    open: false,
  })
  const [isShowWheelMarker, setIsShowWheelMarker] = useState(false)
  const [peekScreen, setIsPeekScreen] = useState(false)

  const wheelScreen = document.getElementById('wheelScreen')
  const isClueGiver = gameState.clueGiver === profile.userId
  const isHost = gameState.hostId === profile.userId

  const rotateDial = (deg: number) => {
    if (deg > 0 && gameState.dialRotation >= 90) return
    if (deg < 0 && gameState.dialRotation <= -90) return

    const newRotation = gameState.dialRotation + deg;

    socket.emit('updateDialRotation', {
      roomId: gameState.roomId,
      rotation: newRotation,
      userName: profile.userName,
    });
  };

  const toggleScreen = () => {
    if (gameState.screenOpen) {
      socket.emit('toggleScreen', {
        roomId: gameState.roomId,
        screenOpen: false,
        userName: profile.userName,
      });
      return
    }
    setModalOptions({
      open: true,
    })
  };

  const handleConfirmToggleScreen = () => {
    socket.emit('toggleScreen', {
      roomId: gameState.roomId,
      screenOpen: true,
      userName: profile.userName,
    });

    setModalOptions({
      open: false,
    })
  }

  const randomizeMarker = () => {
    const randDeg = Math.floor(Math.random() * 180) - 90;
    socket.emit('randomizeMarker', {
      roomId: gameState.roomId,
      rotation: randDeg,
      userName: profile.userName,
    });
  };

  const handlePeekScreen = () => {
    setIsPeekScreen(!peekScreen)
  }


  useEffect(() => {
    if (wheelScreen) setIsShowWheelMarker(true)
  }, [wheelScreen])

  return (
    <div className="relative w-full p2">
      <div className="relative w-full max-w-[1200px] h-full aspect-square mx-auto ">

        <div className="absolute left-0 top-[-4px] w-full h-3  bg-darkBrown"
          style={{ zIndex: 12 }}
        />
        <div id="wheel" className="relative w-full h-full overflow-hidden border-4 border-[#4b352a]">
          {/* Wheel Frame */}
          <div className="absolute left-0 w-full"
            style={{
              zIndex: 11,
            }}
          >
            <Image src={ImageChromeBasic} alt=""></Image>
          </div>
          <div id="hider" className="absolute top-1/2 left-0 w-full h-1/2 bg-darkBrown "
            style={{ transform: 'translateY(-1px)', zIndex: 11 }}
          />

          {/* Wheel Screen */}
          <div
            id="wheelScreen"
            className={clsx(
              "absolute top-0 left-0 w-full h-full transition-transform duration-[3000ms]",
              gameState?.screenOpen ? "rotate-[180deg]" : "rotate-0",
              peekScreen ? "opacity-0" : ""
            )}
            style={{ zIndex: 5 }}
          >
            <Image src={ImageWheelScreen} alt=""></Image>
          </div>

          {/* Wheel Marker */}
          {isShowWheelMarker && <div
            className="absolute top-0 left-0 w-full h-full p-1 flex items-center justify-center z-1"
            style={{ transform: `rotate(${gameState.markerRotation}deg)` }}
          >
            <Image src={ImageWheelScore} alt="" ></Image>
          </div>}

          {/* Wheel Dial */}
          <div
            className="absolute top-0 left-0 w-full h-full z-10 transition-transform duration-300 "
            style={{ transform: `rotate(${gameState.dialRotation}deg)`, scale: '2' }}
          >
            <Image src={ImageWheelDial} alt=""></Image>
          </div>

        </div>

        {/* Controls */}
        <div className="absolute w-full z-20 top-[60%] left-0 mx-auto" >
          {
            isClueGiver && <div className="w-full  top-[50%] left-[-36%] sm:left-0 mx-auto flex justify-center z-50">
              <button onClick={handlePeekScreen} className="w-20 h-20  px-3 py-1 bg-lightYellow rounded-[300px] text-darkBrown font-medium">
                {peekScreen ? "ซ่อนคะแนน" : "แง้มดูคะแนน"}
              </button>
            </div>
          }

          <div className="w-full flex flex-col sm:flex-row justify-center items-center bottom-[100px] left-0 p-5 gap-6 sm:gap-3 mx-auto text-darkBrown"
            style={{ zIndex: '10' }}
          >
            {(isClueGiver || isHost) &&
              <button onClick={randomizeMarker} className="h-10 px-3 py-1 bg-lightYellow rounded-lg max-w-40 font-medium ">สุ่มหมุนคะแนน</button>

            }
            <div className="flex gap-2 items-center">
              <button onClick={() => rotateDial(-10)} className="w-10 h-10 px-3 py-1 bg-lightYellow rounded-[50px]">-</button>
              <button onClick={() => rotateDial(-1)} className="w-8 h-8 px-3 py-1 bg-lightYellow rounded-[50px]">-</button>
              <button onClick={() => rotateDial(1)} className="w-8 h-8 px-3 py-1 bg-lightYellow rounded-[50px] font-medium">+</button>
              <button onClick={() => rotateDial(10)} className="w-10 h-10 px-3 py-1 bg-lightYellow rounded-[50px] font-medium">+</button>
            </div>

            {(isClueGiver || isHost) && (
              <button
                onClick={toggleScreen}
                className="animated-border-button h-10 px-3 py-1 max-w-40 font-medium"
              >
                <p>{gameState?.screenOpen ? "ซ่อนคะแนน" : "เปิดคะแนนให้ทุกคน"}</p>
              </button>
            )}
          </div>
        </div>
      </div>


      <Modal options={modalOptions}>
        <div>
          <p className="text-[20px] font-medium text-center">ยืนยันเปิดคะแนนหรือไม่</p>
          <div className="flex flex-row justify-between mt-4">
            <button className="w-20 rounded-lg bg-darkBrown text-white p-2" onClick={handleConfirmToggleScreen}>ยืนยัน</button>
            <button
              className="w-20 rounded-lg bg-darkBrown text-white p-2 "
              onClick={() => {
                setModalOptions({
                  open: false,
                })
              }}>ปิด</button>

          </div>
        </div>
      </Modal>
    </div>

  );
};

export default WheelDial;
