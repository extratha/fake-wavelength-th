import { useEffect, useRef, useState } from "react";
import type { TeamKey } from "../../TeamManagement";
import type { DialPointerSamplesRef } from "../useDialPointers";
import { buildTrailPathData, getPositionAt } from "./dialTrail";

// ใช้ viewBox เดียวกับหน้าปัด (ดู WheelSvg) ตำแหน่งที่ได้รับจะวางลงได้ตรง ๆ
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 100;

// ขนาดวงกลม/ตัวอักษรคงที่เป็น px ไม่ว่าหน้าปัดจะใหญ่หรือเล็ก
const HEAD_RADIUS_PX = 16;
const LETTER_SIZE_PX = 14;
// ตำแหน่งของคนอื่นมาทุก ~50ms: แสดงช้ากว่าจริงเล็กน้อย จะได้มีจุดก่อน/หลังให้ประมาณตำแหน่งระหว่างกลางได้เสมอ
const REMOTE_RENDER_DELAY_MS = 70;
// หางคือเส้นทางที่ผ่านมาในช่วงเวลานี้ ยาวไม่เกิน N เท่าของเส้นผ่านศูนย์กลาง
const TRAIL_DURATION_MS = 180;
const TRAIL_MAX_LENGTH_IN_HEAD_WIDTHS = 3;

const TEAM_FILL_CLASS: Record<TeamKey, string> = {
  teamA: "fill-teamA",
  teamB: "fill-teamB",
};

export type DialPointerPlayer = {
  userId: string;
  initial: string;
  team: TeamKey | null;
  isMine: boolean;
};

type DialPointerLayerProps = {
  players: DialPointerPlayer[];
  samplesRef: DialPointerSamplesRef;
};

type PointerElements = {
  head: SVGGElement | null;
  trail: SVGPathElement | null;
};

// ชั้นวงกลมของผู้เล่นที่กำลังแตะ/ลากหน้าปัด: วงกลมตามนิ้ว/cursor และหางทรงหยดน้ำตามเส้นทางที่ลากผ่านมา
// วาดใหม่ทุกเฟรม (requestAnimationFrame) ผ่าน ref โดยไม่ render React ทำงานเฉพาะตอนมีคนกำลังแตะ
const DialPointerLayer = ({ players, samplesRef }: DialPointerLayerProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const elementsRef = useRef(new Map<string, PointerElements>());
  // จำนวน px ต่อ 1 หน่วย viewBox (แปลงขนาด px เป็นหน่วยของหน้าปัด)
  const [pixelsPerUnit, setPixelsPerUnit] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const observer = new ResizeObserver(([entry]) => {
      setPixelsPerUnit(entry.contentRect.width / VIEWBOX_WIDTH || 1);
    });
    observer.observe(svgElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const headRadius = HEAD_RADIUS_PX / pixelsPerUnit;
  const letterSize = LETTER_SIZE_PX / pixelsPerUnit;

  // ค่าล่าสุดสำหรับ loop วาด (loop ไม่ต้องเริ่มใหม่ทุกครั้งที่ค่าเหล่านี้เปลี่ยน)
  const drawSettingsRef = useRef({ players, headRadius, showTrail: !prefersReducedMotion });
  drawSettingsRef.current = { players, headRadius, showTrail: !prefersReducedMotion };

  const hasActivePointers = players.length > 0;

  useEffect(() => {
    if (!hasActivePointers) return;

    let frameId = 0;
    const drawFrame = () => {
      const now = performance.now();
      const { players: currentPlayers, headRadius: currentHeadRadius, showTrail } = drawSettingsRef.current;

      currentPlayers.forEach((player) => {
        const samples = samplesRef.current.get(player.userId);
        const elements = elementsRef.current.get(player.userId);
        if (!samples || samples.length === 0 || !elements) return;

        // ของเราเองแสดงตามนิ้วทันที ของคนอื่นแสดงช้ากว่าเล็กน้อยให้เคลื่อนลื่น
        const headTime = player.isMine ? now : now - REMOTE_RENDER_DELAY_MS;
        const head = getPositionAt(samples, headTime);
        elements.head?.setAttribute("transform", `translate(${head.x.toFixed(2)} ${head.y.toFixed(2)})`);

        const trailPathData = showTrail
          ? buildTrailPathData(samples, headTime, {
              durationMs: TRAIL_DURATION_MS,
              headWidth: currentHeadRadius * 2,
              maxLength: currentHeadRadius * 2 * TRAIL_MAX_LENGTH_IN_HEAD_WIDTHS,
            })
          : "";
        elements.trail?.setAttribute("d", trailPathData);
      });

      frameId = requestAnimationFrame(drawFrame);
    };

    frameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameId);
  }, [hasActivePointers, samplesRef]);

  // เก็บ element ของแต่ละคนไว้ให้ loop วาดเข้าถึงได้
  const registerElement = (userId: string, elementName: keyof PointerElements) => (element: SVGGElement | SVGPathElement | null) => {
    const elements = elementsRef.current.get(userId) ?? { head: null, trail: null };
    const nextElements = { ...elements, [elementName]: element };
    if (!nextElements.head && !nextElements.trail) {
      elementsRef.current.delete(userId);
      return;
    }
    elementsRef.current.set(userId, nextElements);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      aria-hidden="true"
      // ไม่รับการกด ให้กดทะลุไปที่หน้าปัด / overflow-visible วงกลมที่ขอบจะได้ไม่ถูกตัด
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
    >
      {players.map((player) => {
        const samples = samplesRef.current.get(player.userId);
        // ตำแหน่งเริ่มต้นก่อนเฟรมแรกของ loop (กันวงกลมโผล่ที่มุมจอแวบหนึ่ง)
        const initialPosition = samples?.[samples.length - 1] ?? { x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 };
        const fillClass = player.team ? TEAM_FILL_CLASS[player.team] : "fill-muted";

        return (
          <g key={player.userId}>
            {/* หางทรงหยดน้ำ สีเดียวกับวงกลม ต่อกันเป็นรูปเดียว */}
            <path ref={registerElement(player.userId, "trail")} className={fillClass} />
            <g ref={registerElement(player.userId, "head")} transform={`translate(${initialPosition.x} ${initialPosition.y})`}>
              <g className="dial-pointer-in">
                <circle r={headRadius} className={fillClass} />
                {/* ตัวอักษรไม่หมุนตามทิศที่ลาก จึงตั้งตรงเสมอ */}
                <text
                  fontSize={letterSize}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-ink font-display"
                >
                  {player.initial}
                </text>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

export default DialPointerLayer;
