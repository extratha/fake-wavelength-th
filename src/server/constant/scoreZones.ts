// โซนคะแนนบนหน้าปัด (องศาเทียบกับตำแหน่งเป้า, ค่าบวก = หมุนตามเข็มนาฬิกา)
// วัดจากรูป wheelBGnum.png เดิม: แต่ละโซนกว้าง 7.5 องศา
// ใช้ร่วมกันทั้ง server (คิดคะแนน) และ client (วาดหน้าปัด) ให้ตรงกันเสมอ
export type ScoreZone = {
  score: 2 | 3 | 4;
  fromDeg: number;
  toDeg: number;
};

export const SCORE_ZONES: ScoreZone[] = [
  { score: 2, fromDeg: -18.75, toDeg: -11.25 },
  { score: 3, fromDeg: -11.25, toDeg: -3.75 },
  { score: 4, fromDeg: -3.75, toDeg: 3.75 },
  { score: 3, fromDeg: 3.75, toDeg: 11.25 },
  { score: 2, fromDeg: 11.25, toDeg: 18.75 },
];

// หาโซนที่เข็มชี้อยู่ ถ้าไม่โดนโซนไหนเลยคืนค่า -1
export const findZoneIndexUnderNeedle = (dialRotation: number, markerRotation: number) => {
  const needleAngleFromMarker = dialRotation - markerRotation;
  return SCORE_ZONES.findIndex(
    (zone) => needleAngleFromMarker >= zone.fromDeg && needleAngleFromMarker < zone.toDeg
  );
};

// คะแนนของทีมที่เดา: 4 / 3 / 2 หรือ 0 ถ้าเข็มไม่อยู่ในโซนไหนเลย
export const getZoneScore = (dialRotation: number, markerRotation: number) => {
  const zoneIndex = findZoneIndexUnderNeedle(dialRotation, markerRotation);
  return zoneIndex === -1 ? 0 : SCORE_ZONES[zoneIndex].score;
};
