import { CSSProperties } from "react";

// ระบบพิกัดของ SVG: viewBox 200 x 100 = ครึ่งวงกลมด้านบน
// จุดศูนย์กลางหน้าปัดอยู่ที่ (100, 100) รัศมี 100 ส่วนครึ่งล่างอยู่นอก viewBox จึงถูกซ่อนอัตโนมัติ
const CENTER_X = 100;
const CENTER_Y = 100;
const RADIUS = 100;

const COLORS = {
  frame: "#4b352a",
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

// โซนคะแนน (องศาจากแนวตั้ง, ค่าบวก = หมุนตามเข็มนาฬิกา) วัดจากรูป wheelBGnum.png เดิม
// export ไว้เพื่อใช้คำนวณคะแนนอัตโนมัติในอนาคต
export const SCORE_ZONES = [
  { score: 2, fromDeg: -18.75, toDeg: -11.25, color: COLORS.zoneScore2 },
  { score: 3, fromDeg: -11.25, toDeg: -3.75, color: COLORS.zoneScore3 },
  { score: 4, fromDeg: -3.75, toDeg: 3.75, color: COLORS.zoneScore4 },
  { score: 3, fromDeg: 3.75, toDeg: 11.25, color: COLORS.zoneScore3 },
  { score: 2, fromDeg: 11.25, toDeg: 18.75, color: COLORS.zoneScore2 },
];

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

type WheelSvgProps = {
  dialRotation: number;
  markerRotation: number;
  screenOpen: boolean;
  showScoreZones: boolean;
  peekScreen: boolean;
};

const WheelSvg = ({ dialRotation, markerRotation, screenOpen, showScoreZones, peekScreen }: WheelSvgProps) => {
  const tickAngles = Array.from(
    { length: TICK_COUNT },
    (_, index) => (index - (TICK_COUNT - 1) / 2) * TICK_SPACING_DEG
  );

  return (
    <svg
      viewBox={`0 0 ${CENTER_X * 2} ${CENTER_Y}`}
      className="block w-full h-auto"
      role="img"
      aria-label="หน้าปัด Wavelength"
    >
      {/* Wheel Marker: วงกลมสีเทา + โซนคะแนน (ซ่อนโซนถ้าผู้เล่นยังไม่ควรเห็น) */}
      <g style={rotateAroundCenter(markerRotation)}>
        <circle cx={CENTER_X} cy={CENTER_Y} r={MARKER_RADIUS} fill={COLORS.markerBackground} />
        {showScoreZones &&
          SCORE_ZONES.map((zone) => {
            const middleDeg = (zone.fromDeg + zone.toDeg) / 2;
            const labelPosition = pointOnCircle(middleDeg, ZONE_LABEL_RADIUS);
            return (
              <g key={zone.fromDeg}>
                <path d={wedgePath(zone.fromDeg, zone.toDeg, MARKER_RADIUS)} fill={zone.color} />
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
          ...rotateAroundCenter(screenOpen ? 180 : 0, `transform 3000ms ${TAILWIND_DEFAULT_EASING}`),
          opacity: peekScreen ? 0 : 1,
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
      <g style={rotateAroundCenter(dialRotation, `transform 300ms ${TAILWIND_DEFAULT_EASING}`)}>
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
