import { io } from "socket.io-client"

// retry ถี่ขึ้นระหว่างรอ server ตื่น (ค่าเริ่มต้นห่างได้ถึง 5 วินาที ทำให้ต่อช้ากว่าที่ server พร้อม)
const RECONNECTION_DELAY_MS = 500
const RECONNECTION_DELAY_MAX_MS = 2000

export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  reconnectionDelay: RECONNECTION_DELAY_MS,
  reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
})
