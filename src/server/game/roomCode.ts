import { randomInt } from "crypto";

// รหัสห้อง 4 ตัว: ตัวเล็ก ตัวใหญ่ และตัวเลข
// ตัดตัวที่หน้าตาคล้ายกันออก (0 O o, 1 l I) จะได้บอกกันปากเปล่าหรืออ่านจากจอแล้วไม่พลาด
const ROOM_CODE_CHARACTERS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;
const MAX_GENERATE_ATTEMPTS = 100;

// ข้อมูลห้องที่แสดงในหน้า lobby
export type RoomSummary = {
  roomId: string;
  playerCount: number;
};

const generateRandomRoomCode = () => {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARACTERS[randomInt(ROOM_CODE_CHARACTERS.length)];
  }
  return code;
};

// สุ่มรหัสที่ยังไม่มีห้องไหนใช้ (โอกาสชนต่ำมาก จาก 56^4 ≈ 9.8 ล้านแบบ แต่ก็เช็คไว้)
export const generateUniqueRoomCode = (isRoomCodeTaken: (code: string) => boolean): string | null => {
  for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
    const code = generateRandomRoomCode();
    if (!isRoomCodeTaken(code)) return code;
  }
  return null;
};
