import type { TeamKey } from "./GameContent/TeamManagement";

// ชื่อและ class สีของแต่ละทีม ใช้ร่วมกันทั้งหน้าห้อง จะได้ตรงกันทุกที่
export const TEAM_LABEL: Record<TeamKey, string> = {
  teamA: "ทีม A",
  teamB: "ทีม B",
};

// ตัวอักษรสีทีมบนพื้นเข้ม (ใช้โทนสว่างที่ผ่าน contrast)
export const TEAM_TEXT_CLASS: Record<TeamKey, string> = {
  teamA: "text-teamAText",
  teamB: "text-teamBText",
};

// จุดสี / พื้น / ขอบ ใช้สีทีมเดิม
export const TEAM_DOT_CLASS: Record<TeamKey, string> = {
  teamA: "bg-teamA",
  teamB: "bg-teamB",
};

export const TEAM_BORDER_CLASS: Record<TeamKey, string> = {
  teamA: "border-teamA",
  teamB: "border-teamB",
};

export const isTeamKey = (team?: string | null): team is TeamKey => team === "teamA" || team === "teamB";
