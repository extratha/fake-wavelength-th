import { Compass } from "lucide-react";
import { CLUE_GIVER_STEPS, ClueGiverStep, GameGuide as GameGuideValue } from "../gameGuideLogic";

type GuideBannerProps = {
  guide: GameGuideValue;
};

// แถบบอกผู้เล่นว่าตอนนี้ต้องทำอะไร: แสดงทีละข้อความ (คนให้คำใบ้เห็นเลขขั้นตอนนำหน้า เช่น "1/4")
const GuideBanner = ({ guide }: GuideBannerProps) => {
  return (
    <section
      aria-label="สิ่งที่ต้องทำตอนนี้"
      className="flex items-start gap-2 rounded-clay border-[3px] border-mediumYellow/70 bg-surfaceDeep px-4 py-3 text-lightBrown"
    >
      <Compass size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-mediumYellow" />
      {/* aria-live ให้โปรแกรมอ่านหน้าจออ่านเมื่อขั้นตอนเปลี่ยน */}
      <div aria-live="polite" className="min-w-0">
        <p className="font-display text-base">
          {guide.kind === "clueGiverSteps" && guide.currentStep && <StepCounter currentStep={guide.currentStep} />}
          {guide.message}
        </p>
        {guide.kind === "message" && guide.hint && <p className="mt-0.5 text-sm text-muted">{guide.hint}</p>}
      </div>
    </section>
  );
};

type StepCounterProps = {
  currentStep: ClueGiverStep;
};

// เลขขั้นตอนของคนให้คำใบ้ เช่น "ขั้น 2/4"
const StepCounter = ({ currentStep }: StepCounterProps) => {
  const stepNumber = CLUE_GIVER_STEPS.findIndex((item) => item.step === currentStep) + 1;
  return (
    <span className="mr-2 inline-block rounded-full bg-mediumYellow px-2.5 py-0.5 align-[1px] font-sans text-sm font-semibold tabular-nums text-darkBrown">
      ขั้น {stepNumber}/{CLUE_GIVER_STEPS.length}
    </span>
  );
};

export default GuideBanner;
