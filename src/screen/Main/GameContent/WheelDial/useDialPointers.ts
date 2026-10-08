import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/lib/socket";
import type { DialPointerPosition } from "./WheelSvg";
import type { DialPointerSample } from "./DialPointerLayer/dialTrail";

// เก็บตำแหน่งย้อนหลังไว้นานเท่านี้ (ใช้วาดหาง + ประมาณตำแหน่งระหว่างจุดที่ได้รับ)
const SAMPLE_HISTORY_MS = 1000;
// กันวงกลมค้าง: ถ้าไม่ได้รับ "ปล่อยแล้ว" (เช่นคนนั้นเน็ตหลุดระหว่างลาก) ให้หายเองหลังเวลานี้
const STUCK_POINTER_TIMEOUT_MS = 30_000;

type DialPointerEvent = DialPointerPosition & { userId: string };

export type DialPointerSamplesRef = MutableRefObject<Map<string, DialPointerSample[]>>;

// นิ้ว/cursor ของผู้เล่นที่กำลังแตะ/ลากหน้าปัด: ของคนอื่นมาจาก server ส่วนของเราเองใส่ตรง ๆ (ไม่ต้องรอ server)
// ตำแหน่งเก็บใน ref (มาถี่มาก) ให้ชั้นวาดอ่านไปวาดเองทุกเฟรม ส่วน state เก็บแค่ "ใครกำลังแตะอยู่"
// เริ่มรอบใหม่ หรือเปิดคะแนนแล้ว (เข็มล็อก) ล้างทั้งหมด
export const useDialPointers = (myUserId: string, roundNumber: number, isRoundLocked: boolean) => {
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);
  const samplesRef: DialPointerSamplesRef = useRef(new Map<string, DialPointerSample[]>());
  const expiryTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removePointer = useCallback((userId: string) => {
    clearTimeout(expiryTimersRef.current.get(userId));
    expiryTimersRef.current.delete(userId);
    samplesRef.current.delete(userId);
    setActiveUserIds((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : ids));
  }, []);

  const movePointer = useCallback(
    (userId: string, position: DialPointerPosition) => {
      const now = performance.now();
      const samples = samplesRef.current.get(userId) ?? [];
      samples.push({ ...position, at: now });
      // ทิ้งจุดเก่า แต่เก็บจุดล่าสุดไว้เสมอ (กดค้างนิ่ง ๆ ยังต้องรู้ตำแหน่ง)
      while (samples.length > 1 && now - samples[0].at > SAMPLE_HISTORY_MS) samples.shift();
      samplesRef.current.set(userId, samples);

      clearTimeout(expiryTimersRef.current.get(userId));
      expiryTimersRef.current.set(userId, setTimeout(() => removePointer(userId), STUCK_POINTER_TIMEOUT_MS));

      // คืน array เดิมถ้ามีอยู่แล้ว React จะไม่ render ใหม่ทุกครั้งที่ขยับ
      setActiveUserIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]));
    },
    [removePointer]
  );

  useEffect(() => {
    const handleDialPointer = ({ userId, x, y }: DialPointerEvent) => movePointer(userId, { x, y });
    const handleDialPointerEnd = ({ userId }: { userId: string }) => removePointer(userId);

    socket.on("dialPointer", handleDialPointer);
    socket.on("dialPointerEnd", handleDialPointerEnd);

    const samples = samplesRef.current;
    const expiryTimers = expiryTimersRef.current;
    return () => {
      socket.off("dialPointer", handleDialPointer);
      socket.off("dialPointerEnd", handleDialPointerEnd);
      expiryTimers.forEach((timer) => clearTimeout(timer));
      expiryTimers.clear();
      samples.clear();
      setActiveUserIds([]);
    };
  }, [roundNumber, isRoundLocked, movePointer, removePointer]);

  const moveMyPointer = useCallback((position: DialPointerPosition) => movePointer(myUserId, position), [movePointer, myUserId]);
  const removeMyPointer = useCallback(() => removePointer(myUserId), [removePointer, myUserId]);

  return { activeUserIds, samplesRef, moveMyPointer, removeMyPointer };
};
