import { socket } from "@/lib/socket";
import {  useState } from "react";
import { GameState } from "../..";
import { Dices } from "lucide-react";
import Modal, { ModalOptions } from "@/component/Modal";

type WordCardProps = {
  gameState: GameState;
  isHost: boolean;
  isClueGiver: boolean;
}

const WordCard = ({ gameState, isHost, isClueGiver }: WordCardProps) => {

  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    open: false,
    message: "",
  });

  const leftWord = gameState.pairWords ? gameState.pairWords.words[0] : ''
  const rightWord = gameState.pairWords ? gameState.pairWords.words[1] : ''

  const handleResetUsedWord = () => {
    socket.emit('resetPairWord', { roomId: gameState.roomId })
  }

  const handleCloseModal = () => {
    setModalOptions({ open: false, message: "" })
  }

  const handleRandomPairWord = () => {
    socket.emit('randomPairWord', { roomId: gameState.roomId }, (response: { success: boolean, message: string, roomId: string }) => {
      console.log("randomWord res " ,response)
      if (!response.success) {
        setModalOptions({
          open: true,
          message: response.message,
          onClose: handleCloseModal
        });
      }
    })
    console.log(gameState.pairWords)
  }

  const CardClass = `min-w-[100px] max-w-[150px] min-h-[100px]  bg-mediumBrown p-3 rounded-[8px] 
  text-white  text-[18px] justify-items-center text-center content-center
  cursor-default  
  `

  return (
    <div className="flex flex-col gap-3 w-full justify-center mt-2">
      <div className="flex flex-row w-full gap-5 justify-center">
        <div
          id="left"
          className={CardClass}
          style={{
            boxShadow: "2px 4px 3px 0px rgba(0,0,0,0.8)"
          }}
        >
          {leftWord}
        </div>

        <div
          id="right"
          className={CardClass}
          style={{
            boxShadow: "-2px 4px 3px 0px rgba(0,0,0,0.8)"
          }}
        >
          {rightWord}
        </div>
      </div>


      {(isHost || isClueGiver) &&
        <div className="flex flex-col gap-2 items-center">
          <button
            className="flex flex-row gap-2 rounded-[50px] bg-lightBrown p-2 text-darkBrown font-medium text-[16px] "
            onClick={handleRandomPairWord}
          >
            สุ่มคู่คำใหม่ <Dices />
          </button>
          <p className="text-white p-1 text-[14px] cursor-pointer"
            onClick={handleResetUsedWord}
          >
            รีเซ็ทคำใช้แล้ว
          </p>
        </div>
      }
      <Modal
        options={modalOptions}
      />
    </div>
  )
}

export default WordCard;