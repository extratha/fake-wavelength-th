import { randomUUID } from "crypto";
import type { RoundResult, TeamKey } from "./scoring";

// แชทในห้อง: เก็บไว้ในหน่วยความจำ server (รีสตาร์ทแล้วหาย เหมือนข้อมูลห้อง)
export const CHAT_MESSAGE_MAX_LENGTH = 200;
export const CHAT_HISTORY_LIMIT = 100;
// กันส่งรัว: ไม่เกิน 5 ข้อความใน 5 วินาที ต่อผู้เล่น
const CHAT_RATE_LIMIT_COUNT = 5;
const CHAT_RATE_LIMIT_WINDOW_MS = 5000;

export type ChatMessage =
  | {
      id: string;
      type: "player";
      userId: string;
      // ชื่อตอนส่ง (เผื่อคนนั้นออกจากห้องไปแล้ว)
      name: string;
      text: string;
      sentAt: number;
    }
  | {
      id: string;
      type: "system";
      text: string;
      sentAt: number;
    }
  | {
      // คำใบ้ใหม่จากคนให้คำใบ้ (แสดงเด่นกว่าข้อความระบบทั่วไป คนที่ดูแชทอยู่จะได้ไม่พลาด)
      id: string;
      type: "clue";
      userId: string;
      name: string;
      clue: string;
      sentAt: number;
    };

export const createPlayerMessage = (userId: string, name: string, text: string): ChatMessage => ({
  id: randomUUID(),
  type: "player",
  userId,
  name,
  text,
  sentAt: Date.now(),
});

export const createSystemMessage = (text: string): ChatMessage => ({
  id: randomUUID(),
  type: "system",
  text,
  sentAt: Date.now(),
});

export const createClueMessage = (userId: string, name: string, clue: string): ChatMessage => ({
  id: randomUUID(),
  type: "clue",
  userId,
  name,
  clue,
  sentAt: Date.now(),
});

// เพิ่มข้อความ แล้วตัดของเก่าทิ้งให้เหลือไม่เกิน CHAT_HISTORY_LIMIT
export const appendChatMessage = (history: ChatMessage[], message: ChatMessage) => {
  history.push(message);
  if (history.length > CHAT_HISTORY_LIMIT) {
    history.splice(0, history.length - CHAT_HISTORY_LIMIT);
  }
};

// ตัดช่องว่างหัวท้าย ไม่รับข้อความว่าง และจำกัดความยาว
export const normalizeChatText = (text: unknown): string | null => {
  if (typeof text !== "string") return null;
  const trimmedText = text.trim();
  if (!trimmedText) return null;
  return trimmedText.slice(0, CHAT_MESSAGE_MAX_LENGTH);
};

// ตรวจว่าส่งเร็วเกินไปไหม (เก็บเวลาที่ส่งล่าสุดของแต่ละคนไว้ใน recentSendTimes)
export const isChatRateLimited = (recentSendTimes: number[], now: number = Date.now()) => {
  const timesInWindow = recentSendTimes.filter((sentAt) => now - sentAt < CHAT_RATE_LIMIT_WINDOW_MS);
  recentSendTimes.splice(0, recentSendTimes.length, ...timesInWindow);
  if (timesInWindow.length >= CHAT_RATE_LIMIT_COUNT) return true;
  recentSendTimes.push(now);
  return false;
};

const TEAM_LABEL: Record<TeamKey, string> = { teamA: "ทีม A", teamB: "ทีม B" };
const GUESS_LABEL = { left: "ซ้าย", right: "ขวา" };

// สรุปผลรอบเป็นข้อความระบบ เช่น "เปิดคะแนน: ทีม A +3 · ทีม B แทงขวา ถูก +1"
export const formatRoundResultMessage = (result: RoundResult) => {
  const guessingPart = `${TEAM_LABEL[result.guessingTeam]} +${result.guessingTeamPoints}`;
  const opposingPart = result.leftRightGuess
    ? `${TEAM_LABEL[result.opposingTeam]} แทง${GUESS_LABEL[result.leftRightGuess]} ${
        result.isLeftRightGuessCorrect ? "ถูก" : "ไม่ถูก"
      } +${result.opposingTeamPoints}`
    : `${TEAM_LABEL[result.opposingTeam]} ไม่ได้แทง`;
  return `เปิดคะแนน: ${guessingPart} · ${opposingPart}`;
};

export const formatWinnerMessage = (winner: TeamKey) => `${TEAM_LABEL[winner]} ชนะเกมนี้!`;
