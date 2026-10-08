import { useSyncExternalStore } from "react";
import { socket } from "@/lib/socket";

const subscribeToConnection = (onConnectionChange: () => void) => {
  socket.on("connect", onConnectionChange);
  socket.on("disconnect", onConnectionChange);
  return () => {
    socket.off("connect", onConnectionChange);
    socket.off("disconnect", onConnectionChange);
  };
};

const getIsConnected = () => socket.connected;

// ตอน render ฝั่ง server ยังไม่มีการเชื่อมต่อ ถือว่ายังไม่ต่อ
// React ใช้ค่านี้ตอน hydrate ให้ตรงกับ HTML จาก server แล้วค่อยเปลี่ยนเป็นค่าจริงทันที
// (เดิมใช้ useState(socket.connected) ถ้า socket ต่อติดอยู่แล้วตอนเปิดหน้า HTML จะไม่ตรงกัน → hydration error)
const getIsConnectedOnServer = () => false;

// สถานะการเชื่อมต่อ socket กับ server (server บน Render ที่หลับอยู่จะใช้เวลาปลุกนาน)
export const useSocketConnected = () =>
  useSyncExternalStore(subscribeToConnection, getIsConnected, getIsConnectedOnServer);
