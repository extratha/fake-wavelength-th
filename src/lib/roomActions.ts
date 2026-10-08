import { useSyncExternalStore } from "react";
import { socket } from "./socket";

// ---------- คำสั่งในห้องเกม (ส่งหลังเข้าห้องเสร็จเท่านั้น) ----------
// ปัญหาเดิม: กดปุ่มตอนเน็ตหลุด socket.io จะเก็บคำสั่งไว้ แล้วส่งออกไป "ก่อน" joinRoom ตอนต่อใหม่
// server ยังไม่รู้ว่า socket ใหม่คือใคร จึงปฏิเสธเงียบ ๆ (เช่นกดสุ่มคู่คำแล้วไม่มีอะไรเกิดขึ้น)
// ที่นี่จึงเก็บคำสั่งไว้เอง แล้วส่งหลังหน้า Main เข้าห้องสำเร็จ (setRoomJoined(true))

// คำสั่งที่รอนานเกินนี้ไม่ส่งแล้ว เพราะสถานะเกมอาจเปลี่ยนไป (เช่นเริ่มรอบใหม่ไปแล้ว) ให้ผู้เล่นกดใหม่เอง
const PENDING_ACTION_MAX_AGE_MS = 10_000;
// คำสั่งที่ส่งแค่ค่าล่าสุดก็พอ (ลากเข็มระหว่างหลุดจะได้ไม่ส่งค่าระหว่างทางเป็นร้อยครั้ง)
const LATEST_ONLY_EVENTS = new Set(["updateDialRotation"]);
const NOTICE_DURATION_MS = 5000;

export type RoomActionNotice = "droppedActions" | "rejectedAction";

type PendingRoomAction = {
  eventName: string;
  args: unknown[];
  queuedAt: number;
};

type RoomConnectionSnapshot = {
  isRoomJoined: boolean;
  notice: RoomActionNotice | null;
};

let snapshot: RoomConnectionSnapshot = { isRoomJoined: false, notice: null };
let pendingActions: PendingRoomAction[] = [];
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const updateSnapshot = (changes: Partial<RoomConnectionSnapshot>) => {
  snapshot = { ...snapshot, ...changes };
  listeners.forEach((listener) => listener());
};

const showNotice = (notice: RoomActionNotice) => {
  if (noticeTimer) clearTimeout(noticeTimer);
  updateSnapshot({ notice });
  noticeTimer = setTimeout(() => updateSnapshot({ notice: null }), NOTICE_DURATION_MS);
};

const sendPendingActions = () => {
  const now = Date.now();
  const actionsToSend = pendingActions.filter((action) => now - action.queuedAt <= PENDING_ACTION_MAX_AGE_MS);
  const hasDroppedActions = actionsToSend.length < pendingActions.length;
  pendingActions = [];

  actionsToSend.forEach((action) => socket.emit(action.eventName, ...action.args));
  if (hasDroppedActions) showNotice("droppedActions");
};

// ส่งคำสั่งในห้อง: เข้าห้องอยู่ → ส่งทันที / กำลังเชื่อมต่อใหม่ → เก็บไว้ส่งหลังเข้าห้องเสร็จ
export const emitRoomAction = (eventName: string, ...args: unknown[]) => {
  if (snapshot.isRoomJoined && socket.connected) {
    socket.emit(eventName, ...args);
    return;
  }

  if (LATEST_ONLY_EVENTS.has(eventName)) {
    pendingActions = pendingActions.filter((action) => action.eventName !== eventName);
  }
  pendingActions.push({ eventName, args, queuedAt: Date.now() });
};

// หน้า Main เรียกเมื่อ joinRoom สำเร็จ (true) และตอนออกจากหน้าห้อง (false)
export const setRoomJoined = (isRoomJoined: boolean) => {
  updateSnapshot({ isRoomJoined });
  if (isRoomJoined) {
    sendPendingActions();
  } else {
    pendingActions = [];
  }
};

// เน็ตหลุด: socket ใหม่ตอนต่อกลับยังไม่อยู่ในห้อง ต้องรอ joinRoom ใหม่ก่อน
socket.on("disconnect", () => {
  updateSnapshot({ isRoomJoined: false });
});

// server ปฏิเสธคำสั่ง (เช่นสิทธิ์เปลี่ยนไปแล้ว หรือข้อมูลบนจอยังไม่อัปเดต) แจ้งผู้เล่นแทนการเงียบ
socket.on("actionRejected", () => {
  showNotice("rejectedAction");
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

// ตอน render ฝั่ง server ยังไม่ได้เข้าห้อง
const SERVER_SNAPSHOT: RoomConnectionSnapshot = { isRoomJoined: false, notice: null };
const getServerSnapshot = () => SERVER_SNAPSHOT;

// สถานะการเข้าห้อง + ข้อความแจ้งเตือน สำหรับแสดงแถบสถานะ
export const useRoomConnection = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
