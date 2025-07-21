import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { socket } from '@/lib/socket'
import { GameState } from '..';
import { useUserProfile } from '@/hooks/useUserProfile';
import Image from 'next/image';

import ImageWheelScore from '@/assets/wheelBGnum.png'
import ImageWheelScreen from '@/assets/wheelScreen.png'
import ImageWheelDial from '@/assets/wheelDial.png'

type WheelDialProps = {
  gameState: GameState
}

const WheelDial = ({ gameState }: WheelDialProps) => {
  const { profile } = useUserProfile()
  const [screenOpen, setScreenOpen] = useState(false);

  const rotateDial = (deg: number) => {
    const newRotation = gameState.dialRotation + deg;

    socket.emit('updateDialRotation', {
      roomId: gameState.roomId,
      rotation: newRotation,
      userName: profile.userName,
    });
  };

  const toggleScreen = () => {
    const newState = !screenOpen;
    setScreenOpen(newState);

    socket.emit('toggleScreen', {
      roomId: gameState.roomId,
      screenOpen: newState,
      userName: profile.userName,
    });
  };

  const randomizeMarker = () => {
    const randDeg = Math.floor(Math.random() * 180) - 90;
    socket.emit('randomizeMarker', {
      roomId: gameState.roomId,
      rotation: randDeg,
      userName: profile.userName,
    });
  };

  return (
    <div className="relative w-full border-2 p2 ">
      <div className="relative w-[600px] h-[600px] mx-auto mb-20">
        {/* Wheel Marker */}
        <div
          className="absolute top-0 left-0 w-full h-full p-1 flex items-center justify-center z-1"
          style={{ transform: `rotate(${gameState.markerRotation}deg)` }}
        >
          <Image src={ImageWheelScore} alt=""></Image>

        </div>

        <div className="absolute top-[50%] w-[100%] h-[300px] bg-darkBrown "> </div>

        {/* Wheel Dial */}
        <div
          className="absolute top-0 left-0 w-full h-full z-10 transition-transform duration-300"
          style={{ transform: `rotate(${gameState.dialRotation}deg)` }}
        >
          {/* <div className="w-full h-full border-4 border-blue-500 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-1 h-[50%] bg-red-500 origin-bottom -translate-x-1/2 -translate-y-full" >
          </div> */}
            <Image src={ImageWheelDial} alt=""></Image>
        </div>

        {/* Wheel Screen */}
        <div
          className={clsx(
            "absolute top-0 left-0 w-full h-full z-2 transition-transform duration-[3000ms]",
            gameState?.screenOpen ? "rotate-[180deg]" : "rotate-0"
          )}
        >
          <Image src={ImageWheelScreen} alt=""></Image>
        </div>

      </div>
      {/* Controls */}
      <div className="w-full absolute flex justify-center bottom-0 left-0 p-5  gap-2 mx-auto text-mediumBrown"
        style={{zIndex:'10'}}
      >
        <button onClick={randomizeMarker} className="px-3 py-1 bg-lightYellow">สุ่มหมุนคะแนน</button>
        <button onClick={() => rotateDial(-10)} className="w-10 h-10 px-3 py-1 bg-lightYellow">-</button>
        <button onClick={() => rotateDial(-1)} className="w-8 h-8  px-3 py-1 bg-lightYellow">-</button>
        <button onClick={() => rotateDial(1)} className="w-8 h-8  px-3 py-1 bg-lightYellow">+</button>
        <button onClick={() => rotateDial(10)} className="w-10 h-10 px-3 py-1 bg-lightYellow">+</button>
        <button onClick={toggleScreen} className="px-3 py-1 bg-lightYellow">
          <p>{gameState?.screenOpen ? "Hide" : "Reveal"}</p>
        </button>

      </div>
    </div>

  );
};

export default WheelDial;
