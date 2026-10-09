import type { GameState } from "./GameContent";
import { TEAM_LABEL, isTeamKey } from "./teamStyles";

// ปุ่ม/ช่องที่ระบบไฮไลต์ให้ผู้เล่นรู้ว่าต้องกดอะไรต่อ (มีได้ทีละอย่าง)
export type GuideTarget =
  | "pickPairWord"
  | "setTarget"
  | "peekTarget"
  | "submitClue"
  | "leftRightGuess"
  | "startTurn"
  | "nextRound";

// ขั้นตอนของคนให้คำใบ้ในแต่ละรอบ เรียงตามลำดับที่ต้องทำ
export type ClueGiverStep = "pickPairWord" | "setTarget" | "peekTarget" | "submitClue";

export const CLUE_GIVER_STEPS: { step: ClueGiverStep; instruction: string }[] = [
  { step: "pickPairWord", instruction: "กด \"สุ่มคู่คำใหม่\" เพื่อเลือกคู่คำของรอบนี้" },
  { step: "setTarget", instruction: "กด \"หมุนโซนคะแนน\" เพื่อสุ่มตำแหน่งเป้าบนหน้าปัด" },
  { step: "peekTarget", instruction: "กดปุ่มรูปตาใต้หน้าปัด เพื่อแง้มดูว่าเป้าอยู่ตรงไหน (คนอื่นไม่เห็น)" },
  { step: "submitClue", instruction: "พิมพ์คำใบ้ที่ชี้ไปทางเป้า แล้วกดส่ง" },
];

export type GameGuide =
  | {
    kind: "clueGiverSteps";
    // null = ทำครบทุกขั้นแล้ว รอทีมหมุนเข็ม
    currentStep: ClueGiverStep | null;
    message: string;
    target: GuideTarget | null;
  }
  | {
    kind: "message";
    message: string;
    // ข้อความเสริมบรรทัดที่ 2 (เช่น หน้าที่ของ host)
    hint?: string;
    target: GuideTarget | null;
  };

type GameGuideContext = {
  myUserId: string;
  isHost: boolean;
  // คนให้คำใบ้กดแง้มดูเป้าแล้วในรอบนี้ (เก็บในเครื่อง ไม่ได้ส่งไป server)
  hasPeekedTarget: boolean;
};

const OPEN_SCORE_HINT = "เมื่อทีมพร้อม host หรือคนให้คำใบ้กด \"เปิดคะแนนให้ทุกคน\"";

// ขั้นที่คนให้คำใบ้ต้องทำต่อ (ส่งคำใบ้แล้วถือว่าผ่านช่วงเตรียมแล้ว ไม่ต้องย้อนไปไฮไลต์ขั้นก่อนหน้า)
const getClueGiverStep = (gameState: GameState, hasPeekedTarget: boolean): ClueGiverStep | null => {
  if (gameState.clue) return null;
  if (!gameState.isPairWordPickedThisRound) return "pickPairWord";
  if (!gameState.isTargetSet) return "setTarget";
  if (!hasPeekedTarget) return "peekTarget";
  return "submitClue";
};

// บอกผู้เล่นว่าตอนนี้ต้องทำอะไร / รออะไร ตามสถานะของรอบ
export const getGameGuide = (gameState: GameState, { myUserId, isHost, hasPeekedTarget }: GameGuideContext): GameGuide => {
  const message = (text: string, target: GuideTarget | null = null, hint?: string): GameGuide => ({
    kind: "message",
    message: text,
    hint,
    target,
  });

  // ---------- จบเกม / จบรอบ (ทุกคนรวมคนให้คำใบ้) ----------
  if (gameState.winner) {
    return isHost
      ? message("เกมจบแล้ว กด \"เริ่มเกมใหม่\" เพื่อเล่นอีกตา", "nextRound")
      : message("เกมจบแล้ว รอ host เริ่มเกมใหม่");
  }

  if (gameState.isRoundLocked) {
    const isScoring = !gameState.roundResult && !!gameState.turn && gameState.isTargetSet;
    if (isScoring) return message("กำลังเปิดคะแนน...");
    return isHost
      ? message("จบรอบแล้ว กด \"เริ่มรอบถัดไป\" เพื่อเล่นต่อ", "nextRound")
      : message("จบรอบแล้ว รอ host เริ่มรอบถัดไป");
  }

  // ---------- คนให้คำใบ้ ----------
  if (gameState.clueGiver === myUserId) {
    const currentStep = getClueGiverStep(gameState, hasPeekedTarget);
    const stepInfo = CLUE_GIVER_STEPS.find((item) => item.step === currentStep);
    return {
      kind: "clueGiverSteps",
      currentStep,
      message: stepInfo
        ? stepInfo.instruction
        : "ส่งคำใบ้แล้ว รอทีมหมุนเข็ม (เปลี่ยนคำใบ้ได้) แล้วกด \"เปิดคะแนนให้ทุกคน\" เมื่อทีมพร้อม",
      target: currentStep,
    };
  }

  // ---------- ผู้เล่นคนอื่น ----------
  const myTeam = gameState.users.find((user) => user.userId === myUserId)?.team;
  if (!isTeamKey(myTeam)) {
    return message("คุณยังไม่มีทีม กด \"เข้าร่วมทีม\" ที่การ์ดทีมเพื่อร่วมเล่น");
  }

  if (!gameState.turn) {
    return isHost
      ? message("กด \"เริ่มรอบ\" ที่การ์ดของทีมที่จะเล่นก่อน", "startTurn")
      : message("รอ host เริ่มรอบ");
  }

  const clueGiverUser = gameState.users.find((user) => user.userId === gameState.clueGiver);
  if (!clueGiverUser) {
    return isHost
      ? message("ยังไม่มีคนให้คำใบ้ เลือกได้จากรายชื่อผู้เล่น")
      : message("รอ host เลือกคนให้คำใบ้");
  }

  if (gameState.clueGiverSkipRequested) {
    return isHost
      ? message(`${clueGiverUser.name} ขอข้าม เลือกคนให้คำใบ้คนใหม่จากรายชื่อผู้เล่น`)
      : message(`${clueGiverUser.name} ขอข้าม รอ host เลือกคนให้คำใบ้คนใหม่`);
  }

  if (!gameState.clue) {
    return message(`รอคำใบ้จาก ${clueGiverUser.name}`);
  }

  const hostHint = isHost ? OPEN_SCORE_HINT : undefined;

  if (myTeam === gameState.turn) {
    return message("ช่วยกันหมุนเข็มให้ตรงกับคำใบ้ (ลากบนหน้าปัด หรือกดปุ่ม + - )", null, hostHint);
  }

  if (gameState.leftRightGuess) {
    return message("แทงแล้ว เปลี่ยนใจได้จนกว่าจะเปิดคะแนน", null, hostHint);
  }
  return message(
    `${TEAM_LABEL[myTeam]}: แทงว่าเป้า (โซน 4) อยู่ครึ่งซ้ายหรือครึ่งขวาของหน้าปัด`,
    "leftRightGuess",
    hostHint
  );
};
