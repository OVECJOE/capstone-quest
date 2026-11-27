import { BODY_COLOURS, DEFAULT_AVATAR, type Avatar } from "@/lib/avatar";
import { STAGE_NAMES, STAGES, type Stage } from "@/lib/journey";

const INK = "#05331D", CREAM = "#FFF8E6", GREEN = "#21E065", MID = "#12B552", DEEP = "#0A7A3A", LIME = "#E4FF5C", WHITE = "#FFFFFF";
type Point = [number, number];

export const poly = (points: Point[], fill: string) => (
  <polygon points={points.map(([x, y]) => `${x},${y}`).join(" ")} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
);

/** An isometric block. (x, y) is the centre of its base, w its half width, h its height. */
export function Box({ x, y, w, h, top, left, right }: { x: number; y: number; w: number; h: number; top: string; left: string; right: string }) {
  const d = w / 2, t = y - h;
  return (
    <>
      {poly([[x - w, t], [x, t + d], [x, y + d], [x - w, y]], left)}
      {poly([[x, t + d], [x + w, t], [x + w, y], [x, y + d]], right)}
      {poly([[x, t - d], [x + w, t], [x, t + d], [x - w, t]], top)}
    </>
  );
}

export function Island({ x, y, w, top = GREEN }: { x: number; y: number; w: number; top?: string }) {
  const d = w / 2;
  return (
    <>
      {poly([[x - w, y + 26], [x, y + d + 26], [x - w * 0.12, y + d + w * 0.75], [x - w * 0.55, y + d + w * 0.2]], "#8A6A3B")}
      {poly([[x, y + d + 26], [x + w, y + 26], [x + w * 0.45, y + d + w * 0.28], [x - w * 0.12, y + d + w * 0.75]], "#6B4F2A")}
      <Box x={x} y={y + 26} w={w} h={26} top={top} left={MID} right={DEEP} />
    </>
  );
}

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <>
      <Box x={x} y={y} w={6 * s} h={20 * s} top="#8A6A3B" left="#8A6A3B" right="#6B4F2A" />
      <Box x={x} y={y - 18 * s} w={20 * s} h={24 * s} top={LIME} left={GREEN} right={MID} />
      <Box x={x} y={y - 44 * s} w={12 * s} h={16 * s} top={LIME} left={GREEN} right={MID} />
    </>
  );
}

function Bridge({ from, to }: { from: Point; to: Point }) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = (i + 1) / 8;
    return (
      <Box key={i} x={from[0] + (to[0] - from[0]) * t} y={from[1] + (to[1] - from[1]) * t + 22 * (1 - (2 * t - 1) ** 2)}
        w={17} h={8} top={CREAM} left="#E9D9AE" right="#CDB77F" />
    );
  });
}

function Topper({ kind }: { kind: Avatar["topper"] }) {
  if (kind === "antenna") return (
    <><path d="M0-135v-28" stroke={INK} strokeWidth={5} /><circle cx={0} cy={-170} r={11} fill="#FF9F1C" stroke={INK} strokeWidth={4} /></>
  );
  if (kind === "cap") return (
    <><Box x={0} y={-130} w={34} h={14} top={GREEN} left={MID} right={DEEP} /><path d="M-32-134l-24 12 22 12 24-12z" fill={DEEP} stroke={INK} strokeWidth={3} strokeLinejoin="round" /></>
  );
  if (kind === "crown") return (
    <path transform="translate(0 15)" d="M-28-132l-4-36 18 16 14-26 14 26 18-16-4 36q-28 14-56 0z" fill="#FFD21F" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
  );
  return (
    <><path d="M0-135v-24" stroke={INK} strokeWidth={4} /><path d="M0-158q4-26 30-22-4 26-30 22zM0-158q-6-20-26-16 4 20 26 16z" fill={GREEN} stroke={INK} strokeWidth={3} /></>
  );
}

/** The guide: a small original block robot, drawn with its feet at (0, 0). */
export function Guide({ avatar }: { avatar?: Avatar | null }) {
  const { body, topper } = { ...DEFAULT_AVATAR, ...avatar };
  const colour = BODY_COLOURS[body] ?? BODY_COLOURS.lime;
  return (
    <g className="animate-hop">
      <Box x={-14} y={0} w={8} h={16} top={DEEP} left={DEEP} right={INK} />
      <Box x={18} y={0} w={8} h={16} top={DEEP} left={DEEP} right={INK} />
      <Box x={0} y={-14} w={34} h={42} top={colour.top} left={colour.left} right={colour.right} />
      <Box x={0} y={-66} w={42} h={48} top="#FFFDF3" left={CREAM} right="#E9D9AE" />
      <g className="animate-blink" fill={INK}><ellipse cx={-25} cy={-90} rx={5} ry={8} /><ellipse cx={-9} cy={-82} rx={5} ry={8} /></g>
      <path d="M-28-77q6 15 21 11" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Topper kind={topper} />
    </g>
  );
}

const SPOTS: Record<Stage, { x: number; y: number; w: number; pin: number; delay: string }> = {
  idea: { x: 150, y: 470, w: 100, pin: 590, delay: "-1s" },
  rules: { x: 370, y: 330, w: 92, pin: 455, delay: "-3s" },
  build: { x: 660, y: 430, w: 150, pin: 615, delay: "0s" },
  review: { x: 930, y: 290, w: 96, pin: 420, delay: "-2s" },
  grade: { x: 1135, y: 455, w: 104, pin: 590, delay: "-4s" },
};

function Landmark({ stage }: { stage: Stage }) {
  const { x, y } = SPOTS[stage];
  if (stage === "idea") return (
    <>
      <Box x={x} y={y} w={26} h={18} top="#C9D6CF" left="#9FB3A8" right="#7E968A" />
      <circle cx={x} cy={y - 62} r={30} fill={LIME} stroke={INK} strokeWidth={4} />
      <path d={`M${x - 12} ${y - 64}l12 14 12-14M${x} ${y - 50}v16M${x} ${y - 108}v-16M${x - 46} ${y - 84}l-14-10M${x + 46} ${y - 84}l14-10`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <Tree x={x - 62} y={y + 4} s={0.8} />
    </>
  );
  if (stage === "rules") return (
    <>
      <Box x={x} y={y + 4} w={38} h={76} top={CREAM} left={WHITE} right="#E9D9AE" />
      <path d={`M${x - 26} ${y - 48}l8 8 12-6M${x - 26} ${y - 24}l8 8 12-6`} fill="none" stroke={DEEP} strokeWidth={6} strokeLinecap="round" />
      <Tree x={x + 56} y={y + 2} s={0.7} />
    </>
  );
  if (stage === "review") return (
    <>
      <Box x={x} y={y} w={34} h={90} top={CREAM} left={WHITE} right="#E9D9AE" />
      <Box x={x} y={y - 90} w={48} h={26} top={LIME} left={GREEN} right={MID} />
      <circle cx={x} cy={y - 158} r={26} fill="#BFF3FF" stroke={INK} strokeWidth={7} />
      <path d={`M${x + 19} ${y - 139}l24 24`} stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <Tree x={x - 56} y={y + 6} s={0.7} />
    </>
  );
  if (stage === "grade") return (
    <>
      <Box x={x} y={y} w={36} h={24} top={CREAM} left={WHITE} right="#E9D9AE" />
      <Box x={x} y={y - 24} w={10} h={28} top="#FFD84A" left="#FFC400" right="#D9A200" />
      <Box x={x} y={y - 52} w={34} h={44} top="#FFE98A" left="#FFD21F" right="#D9A200" />
      <path d={`M${x - 34} ${y - 88}q-32 4-6 34M${x + 34} ${y - 88}q32 4 6 34`} fill="none" stroke="#D9A200" strokeWidth={8} />
    </>
  );
  return (
    <>
      <Tree x={x + 112} y={y + 4} s={0.9} />
      <Box x={x + 34} y={y - 6} w={50} h={14} top="#C9D6CF" left="#9FB3A8" right="#7E968A" />
      <path className="animate-flame" d={`M${x + 16} ${y - 30}q18 62 36 0z`} fill="#FF9F1C" stroke={INK} strokeWidth={3} />
      <path d={`M${x + 12} ${y - 84}l-26 52 28-8zM${x + 56} ${y - 84}l26 52-28-8z`} fill={MID} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <path d={`M${x + 34} ${y - 190}c36 34 34 100 20 154h-40c-14-54-16-120 20-154z`} fill={WHITE} stroke={INK} strokeWidth={4} />
      <path d={`M${x + 34} ${y - 190}c14 13 22 28 26 44h-52c4-16 12-31 26-44z`} fill={LIME} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
      <circle cx={x + 34} cy={y - 108} r={15} fill="#BFF3FF" stroke={INK} strokeWidth={5} />
    </>
  );
}

const Cloud = ({ x, y, delay }: { x: number; y: number; delay: string }) => (
  <path className="animate-drift" style={{ animationDelay: delay }} d={`M${x} ${y}h120a26 26 0 0 0-14-48 40 40 0 0 0-74-8 30 30 0 0 0-32 56z`} fill={CREAM} opacity={0.85} />
);

export function World({ current, done, onPick, avatar }: { current: Stage; done: Stage[]; onPick?: (stage: Stage) => void; avatar?: Avatar | null }) {
  return (
    <div className="relative mx-auto max-w-7xl">
      <svg viewBox="0 0 1280 660" aria-hidden="true" className="block h-auto w-full">
        <Cloud x={90} y={150} delay="0s" /><Cloud x={520} y={105} delay="-9s" /><Cloud x={1060} y={120} delay="-4s" />
        <Bridge from={[200, 455]} to={[325, 350]} /><Bridge from={[430, 345]} to={[560, 420]} />
        <Bridge from={[765, 415]} to={[880, 320]} /><Bridge from={[985, 310]} to={[1090, 430]} />
        {STAGES.map((stage) => {
          const spot = SPOTS[stage];
          const here = stage === current;
          return (
            <g key={stage} className="animate-float" style={{ animationDelay: spot.delay }}>
              {here ? <ellipse className="animate-ring" cx={spot.x} cy={spot.y + 4} rx={spot.w * 1.3} ry={spot.w * 0.65} fill="none" stroke={LIME} strokeWidth={8} strokeDasharray="18 16" /> : null}
              <Island x={spot.x} y={spot.y} w={spot.w} top={stage === "grade" ? LIME : GREEN} />
              <Landmark stage={stage} />
              {here ? <g transform={`translate(${spot.x - spot.w * (stage === "grade" ? 0.75 : 0.5)} ${spot.y + 14})`}><Guide avatar={avatar} /></g> : null}
            </g>
          );
        })}
      </svg>
      {STAGES.map((stage) => {
        // Without a handler the map is a picture, so its labels are not buttons.
        const Pin = onPick ? "button" : "span";
        const colour = stage === current ? "bg-lime" : done.includes(stage) ? "bg-green" : "bg-cream";
        return (
          <Pin key={stage} {...(onPick ? { type: "button" as const, onClick: () => onPick(stage) } : {})}
            className={`absolute hidden min-h-11 -translate-x-1/2 -translate-y-1/2 content-center rounded-full border-3 border-ink px-4 font-display font-bold whitespace-nowrap shadow-[0_5px_0_var(--color-ink)] min-[800px]:block ${onPick ? "cursor-pointer" : ""} ${colour}`}
            style={{ left: `${SPOTS[stage].x / 12.8}%`, top: `${SPOTS[stage].pin / 6.6}%` }}>
            {stage === current && onPick ? `You are here: ${STAGE_NAMES[stage].pin.toLowerCase()}` : `${done.includes(stage) ? "✓ " : ""}${STAGE_NAMES[stage].pin}`}
          </Pin>
        );
      })}
    </div>
  );
}
