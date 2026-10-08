const WAKE_UP_TIMEOUT_MS = 120_000

// ทำงานครั้งเดียวตอน web service เริ่มบูต: ยิงไปปลุก socket server ที่อาจหลับอยู่ (Render แยก service)
// เพื่อให้ server ตื่นขนานไปกับที่ web render หน้าให้ผู้เล่น ไม่ต้องรอผู้เล่นกดสร้างห้องก่อน
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketServerUrl) return;

  // ไม่ await เพื่อไม่ให้การรอ server ไปบล็อกการบูตของ web
  fetch(socketServerUrl, { signal: AbortSignal.timeout(WAKE_UP_TIMEOUT_MS) })
    .then(() => console.log("[wake-up] socket server is awake"))
    .catch((error) => console.warn("[wake-up] could not reach socket server:", error?.message ?? error));
}
