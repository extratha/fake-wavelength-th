import { ChevronRight, Users } from "lucide-react";
import Badge from "@/component/Badge";
import type { RoomSummary } from "@/server/game/roomCode";

type OnlineRoomListProps = {
  rooms: RoomSummary[];
  onJoinRoom: (roomId: string) => void;
};

// รายชื่อห้องที่มีคนอยู่ พร้อมจำนวนผู้เล่น (กดที่ห้องเพื่อเข้าได้เลย)
const OnlineRoomList = ({ rooms, onJoinRoom }: OnlineRoomListProps) => {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-medium text-lightBrown">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ee08a] opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7ee08a]" />
        </span>
        ห้องที่ออนไลน์
      </h3>

      {rooms.length === 0 ? (
        <div className="rounded-2xl border-[3px] border-dashed border-clayEdge/80 bg-surfaceDeep/60 px-4 py-6 text-center">
          <p className="font-display text-base text-lightBrown">ยังไม่มีห้องที่ออนไลน์</p>
          <p className="mt-1 text-sm text-muted">สร้างห้องใหม่ด้านบน แล้วชวนเพื่อนมาเล่นได้เลย</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {rooms.map((room) => (
            <li key={room.roomId}>
              <button
                type="button"
                onClick={() => onJoinRoom(room.roomId)}
                aria-label={`เข้าห้อง ${room.roomId} มีผู้เล่น ${room.playerCount} คน`}
                className="group flex min-h-[56px] w-full cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-clayEdge bg-surfaceDeep px-4 py-2 text-left shadow-clay-sm transition-[transform,box-shadow,background-color] duration-150 ease-out hover:bg-[#4a3529] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60 active:translate-y-[3px] active:shadow-clay-pressed"
              >
                <span className="font-display text-xl font-medium tracking-[0.2em] text-mediumYellow">
                  {room.roomId}
                </span>
                <Badge className="ml-auto">
                  <Users size={14} aria-hidden="true" />
                  {room.playerCount} คน
                </Badge>
                <ChevronRight
                  size={20}
                  aria-hidden="true"
                  className="text-muted transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OnlineRoomList;
