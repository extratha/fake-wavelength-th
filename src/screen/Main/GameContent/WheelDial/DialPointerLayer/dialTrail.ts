import type { DialPointerPosition } from "../WheelSvg";

// ตำแหน่งที่ได้รับ พร้อมเวลาที่ได้รับ (performance.now())
export type DialPointerSample = DialPointerPosition & { at: number };

// ตำแหน่ง ณ เวลาหนึ่ง: ประมาณเชิงเส้นระหว่าง 2 จุดที่ได้รับ (ก่อน/หลังช่วงที่มีข้อมูล ใช้จุดแรก/จุดสุดท้าย)
export const getPositionAt = (samples: DialPointerSample[], time: number): DialPointerPosition => {
  const lastSample = samples[samples.length - 1];
  if (time >= lastSample.at) return lastSample;
  if (time <= samples[0].at) return samples[0];

  for (let index = samples.length - 1; index > 0; index--) {
    const later = samples[index];
    const earlier = samples[index - 1];
    if (time >= earlier.at) {
      const progress = later.at === earlier.at ? 1 : (time - earlier.at) / (later.at - earlier.at);
      return {
        x: earlier.x + (later.x - earlier.x) * progress,
        y: earlier.y + (later.y - earlier.y) * progress,
      };
    }
  }
  return samples[0];
};

// จุดตามเส้นทางที่ผ่านมา เรียงจากหัว (ตำแหน่งปัจจุบัน) ไปหาง (ย้อนหลังไม่เกิน durationMs)
const getRecentPath = (samples: DialPointerSample[], headTime: number, durationMs: number) => {
  const tailTime = headTime - durationMs;
  const path: DialPointerPosition[] = [getPositionAt(samples, headTime)];

  for (let index = samples.length - 1; index >= 0; index--) {
    const sample = samples[index];
    if (sample.at >= headTime) continue;
    if (sample.at <= tailTime) break;
    path.push(sample);
  }

  // ปลายหางตัดที่เวลา tailTime พอดี หางจะหดลงอย่างต่อเนื่องเมื่อหยุดลาก (ไม่หายเป็นช่วง ๆ)
  if (samples[0].at < tailTime) path.push(getPositionAt(samples, tailTime));
  return path;
};

// ทำให้เส้นที่ต่อจุดเป็นเส้นโค้งเนียน (Catmull-Rom) จุดที่ได้รับห่างกันได้ถึง 50ms ถ้าต่อตรง ๆ จะเห็นเป็นมุมหัก
const SMOOTHING_STEPS = 4;

const smoothPath = (points: DialPointerPosition[]) => {
  if (points.length < 3) return points;
  const smoothed: DialPointerPosition[] = [];

  for (let index = 0; index < points.length - 1; index++) {
    const before = points[Math.max(0, index - 1)];
    const start = points[index];
    const end = points[index + 1];
    const after = points[Math.min(points.length - 1, index + 2)];

    for (let step = 0; step < SMOOTHING_STEPS; step++) {
      const t = step / SMOOTHING_STEPS;
      const t2 = t * t;
      const t3 = t2 * t;
      smoothed.push({
        x: 0.5 * (2 * start.x + (-before.x + end.x) * t + (2 * before.x - 5 * start.x + 4 * end.x - after.x) * t2 + (-before.x + 3 * start.x - 3 * end.x + after.x) * t3),
        y: 0.5 * (2 * start.y + (-before.y + end.y) * t + (2 * before.y - 5 * start.y + 4 * end.y - after.y) * t2 + (-before.y + 3 * start.y - 3 * end.y + after.y) * t3),
      });
    }
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
};

// ตัดหางไม่ให้ยาวเกิน maxLength (ลากเร็วมาก ๆ หางจะไม่ยาวพาดทั้งหน้าปัด)
const limitLength = (points: DialPointerPosition[], maxLength: number) => {
  const limited = [points[0]];
  let totalLength = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = Math.hypot(current.x - previous.x, current.y - previous.y);

    if (totalLength + segmentLength >= maxLength) {
      const remainingRatio = (maxLength - totalLength) / segmentLength;
      limited.push({
        x: previous.x + (current.x - previous.x) * remainingRatio,
        y: previous.y + (current.y - previous.y) * remainingRatio,
      });
      break;
    }
    totalLength += segmentLength;
    limited.push(current);
  }
  return limited;
};

const getPathLength = (points: DialPointerPosition[]) =>
  points.reduce((length, point, index) => {
    if (index === 0) return 0;
    const previous = points[index - 1];
    return length + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);

type TrailShape = {
  // ระยะเวลาย้อนหลังที่เอามาวาดหาง
  durationMs: number;
  // ความกว้างที่หัว (เท่าเส้นผ่านศูนย์กลางวงกลม) หน่วย viewBox
  headWidth: number;
  // ความยาวหางสูงสุด หน่วย viewBox
  maxLength: number;
};

// รูปหยดน้ำ: หัวกว้างเท่าวงกลม เรียวแหลมไปตามเส้นทางที่ผ่านมา
// คืนค่า "d" ของ SVG path (ว่าง = ไม่มีหาง เช่นยังไม่ขยับ)
export const buildTrailPathData = (samples: DialPointerSample[], headTime: number, shape: TrailShape) => {
  const path = limitLength(smoothPath(getRecentPath(samples, headTime, shape.durationMs)), shape.maxLength);
  const trailLength = getPathLength(path);
  // หางสั้นกว่านี้ถูกวงกลมบังอยู่แล้ว ไม่ต้องวาด
  if (path.length < 2 || trailLength < shape.headWidth * 0.15) return "";

  const leftEdge: DialPointerPosition[] = [];
  const rightEdge: DialPointerPosition[] = [];
  let distanceFromHead = 0;

  path.forEach((point, index) => {
    if (index > 0) {
      const previous = path[index - 1];
      distanceFromHead += Math.hypot(point.x - previous.x, point.y - previous.y);
    }
    // ทิศของเส้นตรงจุดนี้ (ใช้จุดก่อน/หลัง) แล้วหาทิศตั้งฉากเพื่อขยายความกว้างออกสองข้าง
    const before = path[Math.max(0, index - 1)];
    const after = path[Math.min(path.length - 1, index + 1)];
    const directionX = after.x - before.x;
    const directionY = after.y - before.y;
    const directionLength = Math.hypot(directionX, directionY) || 1;
    const normalX = -directionY / directionLength;
    const normalY = directionX / directionLength;

    // ค่อย ๆ เรียวจากหัวไปปลาย (ยกกำลังน้อยกว่า 1 ให้ป่องใกล้หัวเหมือนหยดน้ำ)
    const halfWidth = (shape.headWidth / 2) * Math.pow(1 - distanceFromHead / trailLength, 0.7);
    leftEdge.push({ x: point.x + normalX * halfWidth, y: point.y + normalY * halfWidth });
    rightEdge.push({ x: point.x - normalX * halfWidth, y: point.y - normalY * halfWidth });
  });

  const outline = [...leftEdge, ...rightEdge.reverse()];
  return `M ${outline.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" L ")} Z`;
};
