"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { socket } from "@/lib/socket";
import clsx from "clsx";
import { ChevronDown, EllipsisVertical, Hand, Info, Users } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { TeamKey } from "../TeamManagement";
import { TEAM_DOT_CLASS, TEAM_LABEL, TEAM_TEXT_CLASS, isTeamKey } from "../../teamStyles";
import PlayerRow, { PlayerAction } from "./PlayerRow";

type Player = {
  userId: string;
  name: string;
  team?: string;
};

type PlayersProps = {
  users: Player[];
  hostId: string;
  isHost: boolean;
  clueGiver: string | null;
  clueGiverSkipRequested: boolean;
}

// ลำดับกลุ่มที่แสดง: ทีม A, ทีม B แล้วตามด้วยคนที่ยังไม่เลือกทีม
const TEAM_GROUP_ORDER: TeamKey[] = ["teamA", "teamB"];

const PanelTitle = ({ playerCount }: { playerCount: number }) => (
  <>
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-[3px] border-clayEdge bg-mediumYellow text-darkBrown shadow-clay-sm"
    >
      <Users size={20} />
    </span>
    <h2 className="text-xl font-medium text-lightBrown">
      ผู้เล่น <span className="font-sans tabular-nums text-muted">({playerCount})</span>
    </h2>
  </>
);

// รายชื่อผู้เล่นในห้อง (desktop อยู่คอลัมน์ขวาและกางไว้ตลอด / มือถือพับเก็บได้)
const PlayersPanel = ({ users, hostId, isHost, clueGiver, clueGiverSkipRequested }: PlayersProps) => {
  const { profile } = useUserProfile();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isExpandedOnMobile, setIsExpandedOnMobile] = useState(false)
  const panelRef = useRef<HTMLElement | null>(null)

  // ปิดเมนูเมื่อกด Esc หรือคลิกนอกกล่องรายชื่อ
  useEffect(() => {
    if (!selectedPlayerId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPlayerId(null);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setSelectedPlayerId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedPlayerId]);

  const handleAction = (player: Player, action: PlayerAction) => {
    if (!profile?.roomId) return;

    if (action === "clueGiver") {
      socket.emit("assignClueGiver", {
        roomId: profile.roomId,
        userId: player.userId,
      });
    }

    if (action === 'assignHost') {
      socket.emit('assignHost', {
        roomId: profile.roomId,
        userId: player.userId,
        targetToHostId: player.userId
      })
    }

    if (action === "kick") {
      socket.emit("kickUser", {
        roomId: profile.roomId,
        userId: player.userId
      });
    }

    setSelectedPlayerId(null);
  };

  if (!users) return <div>กำลังโหลดผู้เล่น</div>

  const playersWithoutTeam = users.filter((player) => !isTeamKey(player.team));

  const renderPlayer = (player: Player) => (
    <PlayerRow
      key={player.userId}
      name={player.name}
      isMe={player.userId === profile?.userId}
      isPlayerHost={player.userId === hostId}
      isPlayerClueGiver={player.userId === clueGiver}
      isRequestingSkip={clueGiverSkipRequested && player.userId === clueGiver}
      canManage={isHost}
      isMenuOpen={selectedPlayerId === player.userId}
      onToggleMenu={() => setSelectedPlayerId((current) => (current === player.userId ? null : player.userId))}
      onAction={(action) => handleAction(player, action)}
    />
  );

  return (
    <section
      ref={panelRef}
      aria-label="รายชื่อผู้เล่น"
      className="rounded-[1.75rem] border-[3px] border-clayEdge bg-surface p-4 shadow-clay sm:p-5"
    >
      {/* หัวกล่อง: มือถือเป็นปุ่มพับ/กาง ส่วน desktop เป็นหัวข้อธรรมดา (รายชื่อกางไว้ตลอด) */}
      <button
        type="button"
        onClick={() => setIsExpandedOnMobile((current) => !current)}
        aria-expanded={isExpandedOnMobile}
        aria-controls="players-panel-content"
        className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60 lg:hidden"
      >
        <PanelTitle playerCount={users.length} />
        <ChevronDown
          size={22}
          aria-hidden="true"
          className={clsx("ml-auto text-muted transition-transform duration-200", isExpandedOnMobile && "rotate-180")}
        />
      </button>
      <div className="hidden items-center gap-3 lg:flex">
        <PanelTitle playerCount={users.length} />
      </div>

      <div id="players-panel-content" className={clsx("mt-4 flex-col gap-4", isExpandedOnMobile ? "flex" : "hidden", "lg:flex")}>
        {/* แนะนำ host ว่าต้องเลือกคนให้คำใบ้ก่อนเริ่มเล่น */}
        {isHost && !clueGiver && (
          <div className="flex gap-2.5 rounded-2xl border-2 border-mediumYellow/70 bg-mediumYellow/15 p-3 text-sm text-lightBrown">
            <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-mediumYellow" />
            <p>
              เริ่มเกม: กด{" "}
              <EllipsisVertical size={16} aria-label="ปุ่มจัดการ" className="inline-block align-text-bottom text-mediumYellow" />{" "}
              ที่ชื่อผู้เล่น แล้วเลือก
              <span className="font-semibold"> &ldquo;ตั้งเป็นคนให้คำใบ้&rdquo;</span>
            </p>
          </div>
        )}

        {/* คนให้คำใบ้ยกมือขอข้าม: บอก host ให้เลือกคนใหม่เอง */}
        {isHost && clueGiver && clueGiverSkipRequested && (
          <div role="status" className="flex gap-2.5 rounded-2xl border-2 border-lightBrown bg-lightBrown/15 p-3 text-sm text-lightBrown">
            <Hand size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-lightBrown" />
            <p>
              <span className="font-semibold">{users.find((player) => player.userId === clueGiver)?.name ?? "คนให้คำใบ้"}</span>{" "}
              ยกมือขอข้าม: กด{" "}
              <EllipsisVertical size={16} aria-label="ปุ่มจัดการ" className="inline-block align-text-bottom text-mediumYellow" />{" "}
              ที่ชื่อคนอื่นในทีม แล้วเลือก<span className="font-semibold"> &ldquo;ตั้งเป็นคนให้คำใบ้&rdquo;</span>
            </p>
          </div>
        )}

        {TEAM_GROUP_ORDER.map((team) => {
          const teamPlayers = users.filter((player) => player.team === team);
          return (
            <div key={team}>
              <h3 className={clsx("mb-2 flex items-center gap-2 text-sm font-medium", TEAM_TEXT_CLASS[team])}>
                <span aria-hidden="true" className={clsx("h-2.5 w-2.5 rounded-full", TEAM_DOT_CLASS[team])} />
                {TEAM_LABEL[team]} <span className="font-sans tabular-nums text-muted">({teamPlayers.length})</span>
              </h3>
              {teamPlayers.length > 0 ? (
                <ul className="flex flex-col gap-2">{teamPlayers.map(renderPlayer)}</ul>
              ) : (
                <p className="rounded-2xl border-2 border-dashed border-clayEdge px-3 py-2 text-sm text-muted">ยังไม่มีคนในทีม</p>
              )}
            </div>
          );
        })}

        {playersWithoutTeam.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-muted/60" />
              ยังไม่เลือกทีม <span className="font-sans tabular-nums">({playersWithoutTeam.length})</span>
            </h3>
            <ul className="flex flex-col gap-2">{playersWithoutTeam.map(renderPlayer)}</ul>
          </div>
        )}
      </div>
    </section>
  );
};

export default PlayersPanel;
