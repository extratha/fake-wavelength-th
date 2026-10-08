import { useCallback, useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import type { ChatMessage } from "@/server/game/chat";

// ให้ตรงกับฝั่ง server (src/server/game/chat.ts)
const CHAT_HISTORY_LIMIT = 100;

type SendChatResponse = { success: boolean; message?: string };

// ข้อมูลแชทของห้อง: โหลดประวัติจาก server + รับข้อความใหม่แบบ real-time
export const useRoomChat = (roomId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadHistory = () => {
      socket.emit("getChatHistory", { roomId }, (history: ChatMessage[]) => {
        setMessages(history);
      });
    };

    const handleChatMessage = (message: ChatMessage) => {
      setMessages((current) => [...current, message].slice(-CHAT_HISTORY_LIMIT));
    };

    // เน็ตหลุดแล้วต่อใหม่: ต้องรอให้หน้า Main กลับเข้าห้องเสร็จก่อน (จะได้ gameStateUpdate)
    // ไม่งั้น server ยังไม่นับว่าเป็นสมาชิก และส่งประวัติว่างกลับมา
    const handleReconnect = () => {
      socket.once("gameStateUpdate", loadHistory);
    };

    // ตอนเปิดกล่องแชท ผู้เล่นอยู่ในห้องแล้ว (หน้า Main แสดงกล่องนี้หลังได้ state ของห้อง)
    loadHistory();
    socket.on("chatMessage", handleChatMessage);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("chatMessage", handleChatMessage);
      socket.off("connect", handleReconnect);
      socket.off("gameStateUpdate", loadHistory);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) =>
      new Promise<SendChatResponse>((resolve) => {
        socket.timeout(5000).emit(
          "sendChatMessage",
          { roomId, text },
          (timeoutError: Error | null, response: SendChatResponse) => {
            resolve(timeoutError ? { success: false, message: "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" } : response);
          }
        );
      }),
    [roomId]
  );

  return { messages, sendMessage };
};
