import { LogIn } from "lucide-react";
import Button from "@/component/Button";
import Card from "@/component/Card";
import InputText from "@/component/InputText";
import type { RoomSummary } from "@/server/game/roomCode";
import OnlineRoomList from "./OnlineRoomList";

type JoinRoomSectionProps = {
  roomCode: string;
  roomCodeError?: string;
  onRoomCodeChange: (roomCode: string) => void;
  onJoinRoom: (roomId?: string) => void;
  rooms: RoomSummary[];
};

// เข้าห้อง: พิมพ์รหัส หรือเลือกจากรายชื่อห้องที่ออนไลน์
const JoinRoomSection = ({ roomCode, roomCodeError, onRoomCodeChange, onJoinRoom, rooms }: JoinRoomSectionProps) => {
  return (
    <Card title="เข้าร่วมห้อง" description="มีรหัสห้องจากเพื่อนแล้ว หรือเลือกห้องที่ออนไลน์อยู่" icon={<LogIn size={22} />}>
      <form
        className="flex items-start gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onJoinRoom();
        }}
      >
        <div className="min-w-0 flex-1">
          <InputText
            label="รหัสห้อง"
            placeholder="เช่น aB3x"
            value={roomCode}
            onChange={(event) => onRoomCodeChange(event.target.value)}
            maxLength={4}
            // รหัสห้องตัวเล็ก-ใหญ่มีผล: ปิด auto-capitalize/autocorrect ของมือถือ
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            hint="ตัวพิมพ์เล็ก-ใหญ่มีผล"
            errorMessage={roomCodeError}
            className="font-display text-xl tracking-[0.3em] placeholder:font-sans placeholder:text-base placeholder:tracking-normal"
          />
        </div>
        {/* เว้นที่ให้ตรงกับช่องพิมพ์ (ใต้ป้ายชื่อ) */}
        <Button type="submit" variant="secondary" className="mt-[1.6rem] shrink-0">
          เข้าห้อง
        </Button>
      </form>

      <div className="mt-6">
        <OnlineRoomList rooms={rooms} onJoinRoom={(roomId) => onJoinRoom(roomId)} />
      </div>
    </Card>
  );
};

export default JoinRoomSection;
