import { CSSProperties, useEffect, useRef, useState } from "react";
import { findZoneIndexUnderNeedle, SCORE_ZONES, ScoreZone } from "@/server/constant/scoreZones";

// ระบบพิกัดของ SVG: viewBox 200 x 100 = ครึ่งวงกลมด้านบน
// จุดศูนย์กลางหน้าปัดอยู่ที่ (100, 100) รัศมี 100 ส่วนครึ่งล่างอยู่นอก viewBox จึงถูกซ่อนอัตโนมัติ
const CENTER_X = 100;
const CENTER_Y = 100;
const RADIUS = 100;

const COLORS = {
  // สีเดียวกับพื้นการ์ด (surface) ให้มุมหน้าปัดกลืนไปกับกล่อง ไม่เป็นกรอบสี่เหลี่ยม
  frame: "#5c4334",
  markerBackground: "#e3e3e3",
  zoneScore2: "#e3a072",
  zoneScore3: "#f0c415",
  zoneScore4: "#3bbbbf",
  zoneLabel: "#ffffff",
  screenOuter: "#4c3328",
  screenInner: "#5b3d2f",
  screenTick: "#ae9c88",
  needle: "#ff5b3a",
};

// โซนคะแนนใช้ตารางเดียวกับ server ที่คิดคะแนน (ตำแหน่งที่วาดจะตรงกับคะแนนที่ได้จริงเสมอ)
const ZONE_COLOR_BY_SCORE: Record<ScoreZone["score"], string> = {
  2: COLORS.zoneScore2,
  3: COLORS.zoneScore3,
  4: COLORS.zoneScore4,
};

const MARKER_RADIUS = 99;
const ZONE_LABEL_RADIUS = 91;
const SCREEN_INNER_RADIUS = 76.6;
const TICK_INNER_RADIUS = 80;
const TICK_OUTER_RADIUS = 92;
const TICK_COUNT = 21;
const TICK_SPACING_DEG = 8.2;

// ใช้ easing เดียวกับ class transition-transform ของ Tailwind ให้ animation เหมือนเวอร์ชัน PNG
const TAILWIND_DEFAULT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

// แปลงมุม (0 = ชี้ขึ้น, บวก = ตามเข็มนาฬิกา) และรัศมี เป็นพิกัด x, y
const pointOnCircle = (angleDeg: number, radius: number) => {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER_X + radius * Math.sin(angleRad),
    y: CENTER_Y - radius * Math.cos(angleRad),
  };
};

const wedgePath = (fromDeg: number, toDeg: number, radius: number) => {
  const start = pointOnCircle(fromDeg, radius);
  const end = pointOnCircle(toDeg, radius);
  return `M ${CENTER_X} ${CENTER_Y} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
};

// หมุน <g> รอบจุดศูนย์กลางหน้าปัดด้วย CSS เพื่อให้ใช้ transition ได้เหมือนเวอร์ชัน PNG
const rotateAroundCenter = (angleDeg: number, transition?: string): CSSProperties => ({
  transform: `rotate(${angleDeg}deg)`,
  transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
  transformBox: "view-box",
  transition,
});

const UPPER_HALF_CIRCLE = `M 0 ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X * 2} ${CENTER_Y} Z`;
const INNER_HALF_CIRCLE = `M ${CENTER_X - SCREEN_INNER_RADIUS} ${CENTER_Y} A ${SCREEN_INNER_RADIUS} ${SCREEN_INNER_RADIUS} 0 0 1 ${CENTER_X + SCREEN_INNER_RADIUS} ${CENTER_Y} Z`;
// พื้นที่สี่เหลี่ยมทั้งหมด ลบด้วยครึ่งวงกลม = กรอบสีน้ำตาลที่มุมซ้ายบน/ขวาบน
const FRAME_PATH = `M 0 0 H ${CENTER_X * 2} V ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 0 0 ${CENTER_Y} Z`;

// เวลาหมุนฉากบังตอนเปิดคะแนน (ใช้ร่วมกับ delay ของ animation โซนที่เข็มชี้)
const SCREEN_REVEAL_DURATION_MS = 3000;
const MARKER_SPIN_DURATION_MS = 2500;
// ตอนแง้ม ฉากบังจางลงแต่ยังเห็นอยู่ จะได้ไม่สับสนกับตอนเปิดหน้าปัดจริง (ฉากหมุนหายไป)
const PEEK_SCREEN_OPACITY = 0.3;
// หมุนกี่รอบก่อนหยุดที่ตำแหน่งเป้าใหม่ (ให้รู้สึกเหมือนวงล้อหมุนจริง)
const MARKER_SPIN_EXTRA_TURNS = 2;
const DIAL_MIN_DEG = -90;
const DIAL_MAX_DEG = 90;

type WheelSvgProps = {
  dialRotation: number;
  markerRotation: number | null;
  screenOpen: boolean;
  showScoreZones: boolean;
  peekScreen: boolean;
  isDraggingDial?: boolean;
  // ถ้าส่ง callback มา จะลากหมุนเข็มบนหน้าปัดได้
  onDialDragStart?: () => void;
  onDialDrag?: (rotation: number) => void;
  onDialDragEnd?: (rotation: number) => void;
};

const WheelSvg = ({
  dialRotation,
  markerRotation,
  screenOpen,
  showScoreZones,
  peekScreen,
  isDraggingDial = false,
  onDialDragStart,
  onDialDrag,
  onDialDragEnd,
}: WheelSvgProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastDragRotationRef = useRef<number | null>(null);

  const tickAngles = Array.from(
    { length: TICK_COUNT },
    (_, index) => (index - (TICK_COUNT - 1) / 2) * TICK_SPACING_DEG
  );

  // ---------- Marker spin ----------
  // CSS transition หมุนตามตัวเลของศา จึงเก็บมุมสะสมไว้ (เช่น 30 -> 30 + 720 + ส่วนต่าง)
  // เพื่อให้หมุนหลายรอบแล้วไปหยุดที่ตำแหน่งใหม่ (มุมสะสม mod 360 = ตำแหน่งเป้าจริงเสมอ)
  const [markerDisplay, setMarkerDisplay] = useState({ angle: markerRotation ?? 0, isSpinning: false });
  const previousMarkerRotationRef = useRef<number | null>(markerRotation);

  useEffect(() => {
    const previousMarkerRotation = previousMarkerRotationRef.current;
    previousMarkerRotationRef.current = markerRotation;

    // หมุนเฉพาะตอนสุ่มเป้าใหม่ (ค่าเปลี่ยนจากตัวเลขเป็นตัวเลข)
    // กรณีเพิ่งได้รับค่า (null -> ตัวเลข เช่นตอนเปิดคะแนน) หรือถูกซ่อน ให้ตั้งค่าทันทีไม่ต้องหมุน
    const isNewRandomTarget =
      previousMarkerRotation !== null && markerRotation !== null && previousMarkerRotation !== markerRotation;

    if (isNewRandomTarget) {
      setMarkerDisplay((current) => ({
        angle: current.angle + MARKER_SPIN_EXTRA_TURNS * 360 + (markerRotation - previousMarkerRotation),
        isSpinning: true,
      }));
    } else {
      setMarkerDisplay({ angle: markerRotation ?? 0, isSpinning: false });
    }
  }, [markerRotation]);

  // ---------- Highlight zone under needle after reveal ----------
  const zoneIndexUnderNeedle =
    screenOpen && showScoreZones && markerRotation !== null
      ? findZoneIndexUnderNeedle(dialRotation, markerRotation)
      : -1;

  // ---------- Drag to rotate dial ----------
  const canDragDial = !!onDialDrag;

  const getRotationFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svgElement = svgRef.current;
    if (!svgElement) return null;

    // จุดหมุนของเข็มอยู่กึ่งกลางขอบล่างของ SVG
    const rect = svgElement.getBoundingClientRect();
    const pivotX = rect.left + rect.width / 2;
    const pivotY = rect.bottom;
    const angleDeg = (Math.atan2(event.clientX - pivotX, pivotY - event.clientY) * 180) / Math.PI;
    return Math.round(Math.min(DIAL_MAX_DEG, Math.max(DIAL_MIN_DEG, angleDeg)));
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!canDragDial) return;
    const rotation = getRotationFromPointer(event);
    if (rotation === null) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    lastDragRotationRef.current = rotation;
    onDialDragStart?.();
    onDialDrag?.(rotation);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingDial) return;
    const rotation = getRotationFromPointer(event);
    if (rotation === null || rotation === lastDragRotationRef.current) return;

    lastDragRotationRef.current = rotation;
    onDialDrag?.(rotation);
  };

  const handlePointerUp = () => {
    if (!isDraggingDial || lastDragRotationRef.current === null) return;
    onDialDragEnd?.(lastDragRotationRef.current);
    lastDragRotationRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CENTER_X * 2} ${CENTER_Y}`}
      className={`block w-full h-auto select-none ${canDragDial ? "cursor-grab active:cursor-grabbing" : ""}`}
      // กันหน้าเลื่อนตอนลากบนจอสัมผัส
      style={{ touchAction: canDragDial ? "none" : undefined }}
      role="img"
      aria-label="หน้าปัด Wavelength"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Wheel Marker: วงกลมสีเทา + โซนคะแนน (ซ่อนโซนถ้าผู้เล่นยังไม่ควรเห็น) */}
      <g
        style={rotateAroundCenter(
          markerDisplay.angle,
          markerDisplay.isSpinning ? `transform ${MARKER_SPIN_DURATION_MS}ms cubic-bezier(0.15, 0.85, 0.25, 1)` : undefined
        )}
      >
        <circle cx={CENTER_X} cy={CENTER_Y} r={MARKER_RADIUS} fill={COLORS.markerBackground} />
        {showScoreZones &&
          SCORE_ZONES.map((zone, zoneIndex) => {
            const middleDeg = (zone.fromDeg + zone.toDeg) / 2;
            const labelPosition = pointOnCircle(middleDeg, ZONE_LABEL_RADIUS);
            return (
              <g
                key={zone.fromDeg}
                className={zoneIndex === zoneIndexUnderNeedle ? "wheel-zone-hit" : undefined}
                style={{ animationDelay: `${SCREEN_REVEAL_DURATION_MS}ms` }}
              >
                <path d={wedgePath(zone.fromDeg, zone.toDeg, MARKER_RADIUS)} fill={ZONE_COLOR_BY_SCORE[zone.score]} />
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  transform={`rotate(${middleDeg} ${labelPosition.x} ${labelPosition.y})`}
                  fill={COLORS.zoneLabel}
                  fontSize={5}
                  fontWeight={700}
                  fontFamily="Arial, Helvetica, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {zone.score}
                </text>
              </g>
            );
          })}
      </g>

      {/* Wheel Screen: ฉากบัง หมุนลงไปครึ่งล่าง (ที่มองไม่เห็น) ตอนเปิดคะแนน */}
      <g
        style={{
          ...rotateAroundCenter(
            screenOpen ? 180 : 0,
            `transform ${SCREEN_REVEAL_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1), opacity 250ms ease`
          ),
          opacity: peekScreen ? PEEK_SCREEN_OPACITY : 1,
        }}
      >
        <path d={UPPER_HALF_CIRCLE} fill={COLORS.screenOuter} />
        <path d={INNER_HALF_CIRCLE} fill={COLORS.screenInner} />
        {tickAngles.map((angleDeg) => {
          const tickStart = pointOnCircle(angleDeg, TICK_INNER_RADIUS);
          const tickEnd = pointOnCircle(angleDeg, TICK_OUTER_RADIUS);
          return (
            <line
              key={angleDeg}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke={COLORS.screenTick}
              strokeWidth={1.9}
            />
          );
        })}
      </g>

      {/* Wheel Dial: เข็มที่ทีมหมุนเพื่อเดา */}
      {/* ตอนลากเอง ไม่ใส่ transition ให้เข็มตามนิ้วทันที */}
      <g style={rotateAroundCenter(dialRotation, isDraggingDial ? undefined : `transform 300ms ${TAILWIND_DEFAULT_EASING}`)}>
        <line
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={CENTER_X}
          y2={CENTER_Y - RADIUS}
          stroke={COLORS.needle}
          strokeWidth={0.8}
        />
        <circle cx={CENTER_X} cy={CENTER_Y} r={3.6} fill={COLORS.needle} />
      </g>

      {/* Wheel Frame: กรอบสีน้ำตาลรอบครึ่งวงกลม */}
      <path d={FRAME_PATH} fill={COLORS.frame} />
    </svg>
  );
};

export default WheelSvg;
