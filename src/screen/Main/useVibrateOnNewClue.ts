import { useEffect, useRef } from "react";

const NEW_CLUE_VIBRATION_MS = 200;

// มือถือสั่นเบา ๆ เมื่อมีคำใบ้ใหม่ (คนให้คำใบ้เองไม่สั่น)
// ไม่สั่นตอนเพิ่งเข้าห้อง/รีโหลด และใช้ได้เฉพาะเบราว์เซอร์ที่รองรับ (เช่น Android) iOS จะไม่สั่น
export const useVibrateOnNewClue = (clue: string | undefined, isClueGiver: boolean) => {
  // undefined = ยังไม่เคยได้รับ state จาก server
  const previousClueRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (clue === undefined) return;

    const previousClue = previousClueRef.current;
    previousClueRef.current = clue;

    const isFirstState = previousClue === undefined;
    const isNewClue = !!clue && clue !== previousClue;
    if (isFirstState || !isNewClue || isClueGiver) return;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(NEW_CLUE_VIBRATION_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clue]);
};
