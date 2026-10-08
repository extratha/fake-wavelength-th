import clsx from "clsx";
import { Check, Compass } from "lucide-react";
import { CLUE_GIVER_STEPS, ClueGiverStep, GameGuide as GameGuideValue } from "../gameGuideLogic";

type GuideBannerProps = {
  guide: GameGuideValue;
};

// แถบบอกผู้เล่นว่าตอนนี้ต้องทำอะไร: คนให้คำใบ้เห็นเป็นขั้นตอน ส่วนคนอื่นเห็นเป็นข้อความ
const GuideBanner = ({ guide }: GuideBannerProps) => {
  return (
    <section
      aria-label="สิ่งที่ต้องทำตอนนี้"
      className="flex flex-col gap-3 rounded-clay border-[3px] border-mediumYellow/70 bg-surfaceDeep px-4 py-3 text-lightBrown"
    >
      {guide.kind === "clueGiverSteps" && <ClueGiverStepList currentStep={guide.currentStep} />}

      <div className="flex items-start gap-2">
        <Compass size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-mediumYellow" />
        {/* aria-live ให้โปรแกรมอ่านหน้าจออ่านเมื่อขั้นตอนเปลี่ยน */}
        <div aria-live="polite" className="min-w-0">
          <p className="font-display text-base">{guide.message}</p>
          {guide.kind === "message" && guide.hint && <p className="mt-0.5 text-sm text-muted">{guide.hint}</p>}
        </div>
      </div>
    </section>
  );
};

type ClueGiverStepListProps = {
  // null = ทำครบทุกขั้นแล้ว
  currentStep: ClueGiverStep | null;
};

const ClueGiverStepList = ({ currentStep }: ClueGiverStepListProps) => {
  const currentStepIndex =
    currentStep === null ? CLUE_GIVER_STEPS.length : CLUE_GIVER_STEPS.findIndex((item) => item.step === currentStep);

  return (
    <ol aria-label="ขั้นตอนของคนให้คำใบ้" className="flex flex-wrap gap-2">
      {CLUE_GIVER_STEPS.map((item, index) => {
        const isDone = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        return (
          <li
            key={item.step}
            aria-current={isCurrent ? "step" : undefined}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm",
              isCurrent && "border-mediumYellow bg-mediumYellow font-semibold text-darkBrown",
              isDone && "border-transparent bg-white/5 text-muted",
              !isCurrent && !isDone && "border-lightBrown/30 text-lightBrown/70"
            )}
          >
            {isDone ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <span aria-hidden="true" className="tabular-nums">
                {index + 1}
              </span>
            )}
            {item.label}
            {isDone && <span className="sr-only">(เสร็จแล้ว)</span>}
          </li>
        );
      })}
    </ol>
  );
};

export default GuideBanner;
