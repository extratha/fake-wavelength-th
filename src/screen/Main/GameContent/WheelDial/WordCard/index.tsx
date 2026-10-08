import clsx from "clsx";
import { emitRoomAction } from "@/lib/roomActions";
import {  useState } from "react";
import { GameState } from "../..";
import { ArrowLeft, ArrowRight, Dices, RotateCcw } from "lucide-react";
import Button from "@/component/Button";
import Modal, { ModalOptions } from "@/component/Modal";

type WordCardProps = {
  gameState: GameState;
  isHost: boolean;
  isClueGiver: boolean;
  // ระบบนำทางไฮไลต์ปุ่ม "สุ่มคู่คำใหม่" (คนให้คำใบ้ยังไม่ได้สุ่มคู่คำของรอบนี้)
  isPickPairWordHighlighted: boolean;
}

const WordCard = ({ gameState, isHost, isClueGiver, isPickPairWordHighlighted }: WordCardProps) => {

  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    open: false,
    message: "",
  });

  const leftWord = gameState.pairWords ? gameState.pairWords.words[0] : ''
  const rightWord = gameState.pairWords ? gameState.pairWords.words[1] : ''

  const handleResetUsedWord = () => {
    emitRoomAction('resetPairWord', { roomId: gameState.roomId })
  }

  const handleCloseModal = () => {
    setModalOptions({ open: false, message: "" })
  }

  const handleRandomPairWord = () => {
    emitRoomAction('randomPairWord', { roomId: gameState.roomId }, (response: { success: boolean, message: string, roomId: string }) => {
      if (!response.success) {
        setModalOptions({
          open: true,
          message: response.message,
          onClose: handleCloseModal
        });
      }
    })
  }

  // การ์ดคำ 2 ฝั่งของสเปกตรัม (ซ้าย = ปลายซ้ายของหน้าปัด, ขวา = ปลายขวา)
  const cardClass = "card-flip-in flex min-h-[96px] flex-1 items-center justify-center gap-2 rounded-clay border-[3px] border-clayEdge bg-lightBrown px-3 py-3 text-center font-display text-lg font-medium text-darkBrown shadow-clay-sm sm:text-xl"

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="mx-auto flex w-full max-w-[560px] gap-3 sm:gap-4">
        {/* key เปลี่ยนตามคู่คำ ทำให้การ์ดพลิกเข้ามาใหม่ทุกครั้งที่สุ่มคู่คำ */}
        <div key={`left-${leftWord}-${rightWord}`} id="left" className={cardClass}>
          <ArrowLeft size={20} aria-hidden="true" className="shrink-0 text-mediumBrown" />
          <span className="break-words">{leftWord || "—"}</span>
        </div>

        <div key={`right-${leftWord}-${rightWord}`} id="right" className={cardClass} style={{ animationDelay: "120ms" }}>
          <span className="break-words">{rightWord || "—"}</span>
          <ArrowRight size={20} aria-hidden="true" className="shrink-0 text-mediumBrown" />
        </div>
      </div>

      {(isHost || isClueGiver) &&
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRandomPairWord}
            className={clsx(isPickPairWordHighlighted && "guide-highlight")}
          >
            <Dices size={18} aria-hidden="true" />
            สุ่มคู่คำใหม่
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetUsedWord}>
            <RotateCcw size={16} aria-hidden="true" />
            รีเซ็ตคำที่ใช้แล้ว
          </Button>
        </div>
      }
      <Modal
        options={modalOptions}
      />
    </div>
  )
}

export default WordCard;