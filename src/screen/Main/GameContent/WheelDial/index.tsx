import debounce from "lodash.debounce";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { emitRoomAction } from "@/lib/roomActions";
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
import LeftRightGuess from "./LeftRightGuess";
import RoundResultPanel from "./RoundResultPanel";
import { TeamKey } from "../TeamManagement";
import { Eye, EyeClosed, EyeOff, RefreshCw } from "lucide-react";
import Button from "@/component/Button";
import IconButton from "@/component/IconButton";
import type { GuideTarget } from "../../gameGuideLogic";

// ปุ่มหมุนเข็ม: ซ้าย 10 / ซ้าย 1 / ขวา 1 / ขวา 10 องศา
const DIAL_STEPS = [-10, -1, 1, 10];

type WheelDialProps = {
  gameState: GameState;
  // ปุ่ม/ช่องที่ระบบนำทางไฮไลต์อยู่
  guideTarget: GuideTarget | null;
  // คนให้คำใบ้แง้มดูเป้า (หลังหมุนโซนคะแนนแล้ว)
  onPeekTarget: () => void;
};

const WheelDial = ({ gameState, guideTarget, onPeekTarget }: WheelDialProps) => {
  const { profile } = useUserProfile();

  const [modalOptions, setModalOptions] = useState({
    open: false,
  });
  const [peekScreen, setIsPeekScreen] = useState(false);

  const isClueGiver = gameState.clueGiver === profile.userId;
  const isHost = gameState.hostId === profile.userId;
  // แง้มได้เฉพาะคนให้คำใบ้ และตอนหน้าปัดยังปิดอยู่ (กันค้างตอนเปลี่ยนคนให้คำใบ้ ที่ปุ่มแง้มหายไปแล้วกดปิดไม่ได้)
  const isPeeking = peekScreen && isClueGiver && !gameState.screenOpen;

  // ---------- เลื่อนจอมาที่หน้าปัดตอนเปิดคะแนน ----------
  const wheelRef = useRef<HTMLDivElement | null>(null);
  // undefined = ยังไม่เคยได้รับ state (เพิ่งเข้าห้อง / รีโหลด) ไม่ต้องเลื่อน
  const previousIsRoundLockedRef = useRef<boolean | undefined>(undefined);

  // server ล็อกรอบเฉพาะตอนเปิดคะแนนครั้งแรกของรอบ (ซ่อนแล้วเปิดใหม่ไม่ล็อกซ้ำ)
  // จึงเลื่อนจอทุกคนมาดูผลที่หน้าปัดแค่ครั้งเดียวต่อรอบ บนมือถือคนส่วนใหญ่อยู่ที่แชทด้านล่าง
  useEffect(() => {
    const wasRoundLocked = previousIsRoundLockedRef.current;
    previousIsRoundLockedRef.current = gameState.isRoundLocked;

    const isFirstRevealOfRound = wasRoundLocked === false && gameState.isRoundLocked;
    const wheelElement = wheelRef.current;
    if (!isFirstRevealOfRound || !wheelElement) return;

    // หน้าปัดอยู่ในจออยู่แล้ว (เช่นบน desktop) ไม่ต้องเลื่อน
    const wheelRect = wheelElement.getBoundingClientRect();
    const isWheelFullyVisible = wheelRect.top >= 0 && wheelRect.bottom <= window.innerHeight;
    if (isWheelFullyVisible) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    wheelElement.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
  }, [gameState.isRoundLocked]);

  // เริ่มรอบใหม่ หรือไม่ได้เป็นคนให้คำใบ้แล้ว: ล้างสถานะแง้ม จะได้ไม่แง้มค้างไปรอบหน้า
  useEffect(() => {
    setIsPeekScreen(false);
  }, [gameState.roundNumber, isClueGiver]);

  // แจ้งระบบนำทางว่าแง้มดูเป้าแล้ว (ต้องมีเป้าก่อน และแจ้งใหม่ถ้าหมุนโซนใหม่ระหว่างที่แง้มค้างไว้)
  useEffect(() => {
    if (isPeeking && gameState.isTargetSet) onPeekTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPeeking, gameState.isTargetSet, gameState.markerRotation]);

  const myTeam = (gameState.users.find((user) => user.userId === profile.userId)?.team ?? null) as TeamKey | null;
  // หมุนเข็มได้เฉพาะสมาชิกทีมเดียวกับคนให้คำใบ้ ที่ไม่ใช่คนให้คำใบ้เอง และต้องยังไม่เปิดหน้าปัด
  // (server เช็คซ้ำอีกชั้น ที่นี่แค่ปิดปุ่มไว้ไม่ให้งง)
  const clueGiverTeam = gameState.users.find((user) => user.userId === gameState.clueGiver)?.team;
  const isOnGuessingTeam = !!clueGiverTeam && myTeam === clueGiverTeam;
  const canRotateDial = isOnGuessingTeam && !isClueGiver;
  const isDialLocked = gameState.isRoundLocked || !canRotateDial;

  // ---------- ลากหมุนเข็ม ----------
  // ระหว่างลาก แสดงค่าในเครื่องตัวเองทันที (ไม่ต้องรอ server) แล้วค่อยส่งค่าไป server เป็นระยะ
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [localDialRotation, setLocalDialRotation] = useState<number | null>(null);

  // debounce + maxWait = throttle: ส่งไม่เกินทุก 60ms ระหว่างลาก ให้คนอื่นเห็นเข็มขยับตาม
  const emitDialRotationThrottled = useMemo(
    () =>
      debounce(
        (roomId: string, rotation: number, userName: string) => {
          emitRoomAction("updateDialRotation", { roomId, rotation, userName });
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
    emitRoomAction("updateDialRotation", {
      roomId: gameState.roomId,
      rotation,
      userName: profile.userName,
    });
  };

  const displayedDialRotation = localDialRotation ?? gameState.dialRotation;


  const rotateDial = (deg: number) => {
    if (isDialLocked) return;
    if (deg > 0 && gameState.dialRotation >= 90) return;
    if (deg < 0 && gameState.dialRotation <= -90) return;

    // clamp ไว้ในช่วง -90 ถึง 90 กันกรณีเช่นอยู่ที่ 85 แล้วกด +10 เป็น 95
    const newRotation = Math.min(90, Math.max(-90, gameState.dialRotation + deg));

    emitRoomAction("updateDialRotation", {
      roomId: gameState.roomId,
      rotation: newRotation,
      userName: profile.userName,
    });
  };

  const toggleScreen = () => {
    if (gameState.screenOpen) {
      emitRoomAction("toggleScreen", {
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
    emitRoomAction("toggleScreen", {
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
    emitRoomAction("randomizeMarker", {
      roomId: gameState.roomId,
      userName: profile.userName,
    });
    emitRoomAction('setDisableRandomMaker', {
      roomId : gameState.roomId
    })
  };


  const handlePeekScreen = () => {
    setIsPeekScreen(!isPeeking);
  };

  // ข้อความบอกว่าทำไมหมุนเข็มไม่ได้ (ปุ่มถูกปิดไว้)
  const dialLockedReason = gameState.isRoundLocked
    ? "เปิดหน้าปัดแล้ว เข็มถูกล็อก"
    : !gameState.clueGiver
      ? "รอ host เลือกคนให้คำใบ้ก่อน"
      : !canRotateDial
        ? "หมุนเข็มได้เฉพาะเพื่อนร่วมทีมของคนให้คำใบ้"
        : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className={clsx("relative mx-auto w-full max-w-[720px]", isClueGiver && "mb-3")}>
        <div id="wheelSvg" ref={wheelRef} className="overflow-hidden">
          <WheelSvg
            dialRotation={displayedDialRotation}
            markerRotation={gameState.markerRotation}
            screenOpen={gameState.screenOpen}
            showScoreZones={gameState.screenOpen || isClueGiver}
            peekScreen={isPeeking}
            isDraggingDial={isDraggingDial}
            onDialDragStart={isDialLocked ? undefined : handleDialDragStart}
            onDialDrag={isDialLocked ? undefined : handleDialDrag}
            onDialDragEnd={isDialLocked ? undefined : handleDialDragEnd}
          />
        </div>

        {/* ปุ่มแง้มดูเป้า (เฉพาะคนให้คำใบ้): ลอยทับขอบล่างกลางหน้าปัด ~60% (กลางหน้าปัดไม่มีข้อมูลสำคัญ)
            ใช้ div ห่อเพื่อจัดตำแหน่ง ไม่ให้ transform ชนกับเอฟเฟกต์กดยุบของปุ่ม
            ส่วนที่ยื่นลงมาด้านล่าง เผื่อที่ไว้ด้วย mb-3 ของกล่องหน้าปัด จะได้ไม่ทับปุ่มหมุนเข็ม */}
        {isClueGiver && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[40%]">
            <IconButton
              size="lg"
              variant="secondary"
              aria-label={isPeeking ? "เลิกแง้มดูเป้า" : "แง้มดูเป้า"}
              aria-pressed={isPeeking}
              title={isPeeking ? "เลิกแง้มดูเป้า" : "แง้มดูเป้า"}
              onClick={handlePeekScreen}
              className={clsx(guideTarget === "peekTarget" && "guide-highlight")}
            >
              {isPeeking ? <EyeClosed size={22} aria-hidden="true" /> : <Eye size={22} aria-hidden="true" />}
            </IconButton>
          </div>
        )}
      </div>

      {/* ---------- โซนคุมหน้าปัด ---------- */}
      {/* หมุนเข็มทีละ 1 / 10 องศา (นอกจากการลากบนหน้าปัด) */}
      <div className="flex flex-col items-center gap-2">
        <div role="group" aria-label="หมุนเข็ม" className="flex items-center gap-2">
          {DIAL_STEPS.map((step) => (
            <IconButton
              key={step}
              size={Math.abs(step) === 10 ? "lg" : "md"}
              aria-label={`หมุนเข็มไปทาง${step < 0 ? "ซ้าย" : "ขวา"} ${Math.abs(step)} องศา`}
              disabled={isDialLocked}
              onClick={() => rotateDial(step)}
              className="font-sans font-semibold tabular-nums"
            >
              {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
            </IconButton>
          ))}
        </div>
        {dialLockedReason && <p className="text-center text-sm text-muted">{dialLockedReason}</p>}
      </div>

      {(isHost || isClueGiver) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={gameState.disableRandomMaker}
            onClick={randomizeMarker}
            className={clsx(guideTarget === "setTarget" && "guide-highlight")}
          >
            <RefreshCw size={18} aria-hidden="true" />
            หมุนโซนคะแนน
          </Button>
          <Button variant={gameState.screenOpen ? "ghost" : "primary"} onClick={toggleScreen}>
            {gameState.screenOpen ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            {gameState.screenOpen ? "ซ่อนคะแนน" : "เปิดคะแนนให้ทุกคน"}
          </Button>
        </div>
      )}

      {/* ---------- โซนคู่คำ ---------- */}
      <section aria-label="คู่คำรอบนี้" className="flex flex-col gap-3 border-t-2 border-clayEdge/60 pt-4">
        <p className="text-center font-display text-sm text-muted">คู่คำรอบนี้</p>
        <WordCard
          gameState={gameState}
          isHost={isHost}
          isClueGiver={isClueGiver}
          isPickPairWordHighlighted={guideTarget === "pickPairWord"}
        />
      </section>

      <LeftRightGuess gameState={gameState} myTeam={myTeam} isHighlighted={guideTarget === "leftRightGuess"} />

      <RoundResultPanel gameState={gameState} isHost={isHost} isNextRoundHighlighted={guideTarget === "nextRound"} />

      <Modal options={modalOptions}>
        <div>
          <p className="text-center font-display text-xl font-medium">
            ยืนยันเปิดคะแนนหรือไม่
          </p>
          <p className="mt-1 text-center text-sm text-darkBrown/80">เปิดแล้วจะล็อกเข็มและการแทงซ้าย/ขวาทันที</p>
          <div className="mt-5 flex flex-row justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setModalOptions({
                  open: false,
                });
              }}
            >
              ยกเลิก
            </Button>
            <Button onClick={handleConfirmToggleScreen}>
              <Eye size={18} aria-hidden="true" />
              ยืนยันเปิด
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WheelDial;
