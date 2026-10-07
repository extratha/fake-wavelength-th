// ⚠️ LEGACY: หน้าปัดเวอร์ชันรูป PNG เดิม (ก่อนย้ายไปใช้ WheelSvg)
// เก็บ source ไว้อ้างอิงเท่านั้น ตอนนี้ไม่มีไฟล์ไหน import component นี้
// จึงไม่ถูก bundle และไม่ทำให้ client ต้องโหลดรูปจาก Cloudinary
// ถ้าต้องการกลับไปใช้ ให้ import ใน WheelDial แทน <WheelSvg /> (props เหมือนกัน)

import debounce from "lodash.debounce";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import Image from "next/image";

type WheelPngProps = {
  dialRotation: number;
  markerRotation: number;
  screenOpen: boolean;
  showScoreZones: boolean;
  peekScreen: boolean;
};

const WheelPng = ({ dialRotation, markerRotation, screenOpen, showScoreZones, peekScreen }: WheelPngProps) => {
  const [wheelHeight, setWheelHeight] = useState("");
  const wheelRef = useRef<HTMLDivElement | null>(null);

  // รูปแต่ละชั้นเป็นสี่เหลี่ยมจัตุรัส แสดงแค่ครึ่งบน จึงต้องตั้งความสูง = ครึ่งหนึ่งของความกว้าง
  useEffect(() => {
    const debouncedUpdate = debounce(() => {
      if (wheelRef.current) {
        setWheelHeight(`${wheelRef.current.clientWidth / 2}px`);
      }
    }, 200);

    debouncedUpdate();

    window.addEventListener("resize", debouncedUpdate);
    return () => {
      window.removeEventListener("resize", debouncedUpdate);
    };
  }, []);

  return (
    <div
      id="wheel"
      ref={wheelRef}
      className="relative w-full overflow-hidden border-4 border-[#4b352a]"
      style={{
        height: wheelHeight,
      }}
    >
      {/* Wheel Frame */}
      <div
        className="absolute left-0  w-full"
        style={{
          zIndex: 11,
        }}
      >
        <Image
          src={
            "https://res.cloudinary.com/dpya79wdj/image/upload/w_800,h_800,c_limit/v1753419058/chromeBasic_dvojai.png"
          }
          alt=""
          loading="eager"
          unoptimized
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
        ></Image>
      </div>

      {/* Wheel Screen */}
      <div
        id="wheelScreen"
        className={clsx(
          "absolute left-0 w-full  transition-transform duration-[3000ms]  ",
          screenOpen ? "rotate-[180deg]" : "rotate-0",
          peekScreen ? "opacity-0" : ""
        )}
        style={{ zIndex: 5, }}
      >
        <Image
          src={
            "https://res.cloudinary.com/dpya79wdj/image/upload/w_1000,h_1000,c_limit/v1753419059/wheelScreen_nttzdb.png"
          }
          alt=""
          loading="eager"
          unoptimized
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
        ></Image>
      </div>

      {/* Wheel Marker */}
      <div
        className="absolute top-0 left-0 w-full  p-1 flex items-center justify-center z-1 scale-[0.8]"
        style={{
          transform: `rotate(${markerRotation}deg)`,
          zIndex: 1,
        }}
      >
        {
          !showScoreZones ?
            <Image
              src={
                "https://res.cloudinary.com/dpya79wdj/image/upload/w_1000,h_1000,c_limit/v1753455560/wheelBGnum_hide_fempdb.png"
              }
              alt=""
              loading="eager"
              unoptimized
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
            /> : <Image
              src={
                "https://res.cloudinary.com/dpya79wdj/image/upload/w_1000,h_1000,c_limit/v1753418311/wheelBGnum_rcrfvd.png"
              }
              alt=""
              loading="eager"
              unoptimized
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto"
            />
        }
      </div>

      {/* Wheel Dial */}
      <div
        className="absolute top-0 left-0 w-full z-10 transition-transform duration-300 "
        style={{
          transform: `rotate(${dialRotation}deg)`,
          scale: 2,
        }}
      >
        <Image
          src={
            "https://res.cloudinary.com/dpya79wdj/image/upload/w_900,h_900,c_limit/v1753419058/wheelDial_xpfqxq.png"
          }
          alt=""
          loading="eager"
          unoptimized
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
        ></Image>
      </div>
    </div>
  );
};

export default WheelPng;
