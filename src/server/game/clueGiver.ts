// เลือกคนให้คำใบ้แบบสุ่มที่ยุติธรรม
// 1. เลือกเฉพาะสมาชิกทีมที่เคยเป็นคนให้คำใบ้ "น้อยครั้งที่สุด" ในเกมนี้ → ทุกคนได้เป็นครบก่อนจะวนซ้ำ
// 2. ถ้ามีตัวเลือกมากกว่า 1 คน ไม่เลือกคนที่เพิ่งเป็นคนให้คำใบ้ "ตาล่าสุดของทีมนี้" ซ้ำ
// 3. สุ่มจากตัวเลือกที่เหลือ (ลำดับไม่ตายตัวเหมือนการวนตามลำดับเข้าห้อง)
export const pickFairRandomClueGiver = (
  teamMemberIds: string[],
  turnCountByUserId: Record<string, number>,
  lastClueGiverOfTeamId: string | null,
  random: () => number = Math.random
): string | null => {
  if (teamMemberIds.length === 0) return null;

  const getTurnCount = (userId: string) => turnCountByUserId[userId] ?? 0;
  const fewestTurns = Math.min(...teamMemberIds.map(getTurnCount));
  let candidates = teamMemberIds.filter((userId) => getTurnCount(userId) === fewestTurns);

  if (candidates.length > 1) {
    candidates = candidates.filter((userId) => userId !== lastClueGiverOfTeamId);
  }

  return candidates[Math.floor(random() * candidates.length)];
};
