import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

// สถานะการเชื่อมต่อ socket กับ server (server บน Render ที่หลับอยู่จะใช้เวลาปลุกนาน)
export const useSocketConnected = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    // ต่อติดไปแล้วก่อน effect นี้ทำงาน
    setIsConnected(socket.connected);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  return isConnected;
};
