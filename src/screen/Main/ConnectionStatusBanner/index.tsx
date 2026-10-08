import { useEffect, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { RoomActionNotice, useRoomConnection } from "@/lib/roomActions";

// หลุดสั้น ๆ แป๊บเดียวแล้วต่อได้ ไม่ต้องขึ้นแถบให้กะพริบ
const RECONNECTING_BANNER_DELAY_MS = 1000;

const NOTICE_MESSAGE: Record<RoomActionNotice, string> = {
  droppedActions: "เชื่อมต่อนานเกินไป คำสั่งที่กดไว้ระหว่างนั้นถูกยกเลิก กดใหม่อีกครั้งได้เลย",
  rejectedAction: "ทำรายการไม่สำเร็จ ข้อมูลบนจออาจยังไม่อัปเดต ลองใหม่อีกครั้ง",
};

// แถบลอยบนสุดของหน้าห้อง: บอกว่ากำลังเชื่อมต่อใหม่ หรือคำสั่งที่กดไปไม่สำเร็จ (แทนการเงียบไป)
const ConnectionStatusBanner = () => {
  const { isRoomJoined, notice } = useRoomConnection();
  const [isReconnectingVisible, setIsReconnectingVisible] = useState(false);

  useEffect(() => {
    if (isRoomJoined) {
      setIsReconnectingVisible(false);
      return;
    }
    const showTimer = setTimeout(() => setIsReconnectingVisible(true), RECONNECTING_BANNER_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, [isRoomJoined]);

  if (!isReconnectingVisible && !notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-3">
      <p
        role="status"
        aria-live="polite"
        className="flex max-w-[460px] items-start gap-2 rounded-2xl border-[3px] border-clayEdge bg-mediumYellow px-4 py-2 text-sm font-medium text-darkBrown shadow-clay-sm"
      >
        {isReconnectingVisible ? (
          <>
            <LoaderCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 animate-spin" />
            กำลังเชื่อมต่อใหม่... ปุ่มที่กดไว้จะทำงานเมื่อเชื่อมต่อเสร็จ
          </>
        ) : (
          notice && (
            <>
              <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              {NOTICE_MESSAGE[notice]}
            </>
          )
        )}
      </p>
    </div>
  );
};

export default ConnectionStatusBanner;
