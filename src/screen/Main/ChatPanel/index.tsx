import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowDown, MessageSquare, Send } from "lucide-react";
import IconButton from "@/component/IconButton";
import InputText from "@/component/InputText";
import { GameState } from "../GameContent";
import ChatMessageItem from "./ChatMessageItem";
import { useRoomChat } from "./useRoomChat";

type ChatPanelProps = {
  gameState: GameState;
  myUserId: string;
  isClueGiver: boolean;
  className?: string;
};

// ให้ตรงกับฝั่ง server (src/server/game/chat.ts)
const CHAT_MESSAGE_MAX_LENGTH = 200;
// ห่างจากล่างสุดไม่เกินเท่านี้ ถือว่ายังอยู่ล่างสุด (เลื่อนลงอัตโนมัติเมื่อมีข้อความใหม่)
const NEAR_BOTTOM_THRESHOLD_PX = 48;

// แชทของห้อง (desktop: คอลัมน์ขวาใต้รายชื่อผู้เล่น / มือถือ: ล่างสุดของหน้า)
const ChatPanel = ({ gameState, myUserId, isClueGiver, className }: ChatPanelProps) => {
  const { messages, sendMessage } = useRoomChat(gameState.roomId);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const panelRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLOListElement | null>(null);
  const isNearBottomRef = useRef(true);
  const lastMessageIdRef = useRef<string | null>(null);
  // มีข้อความใหม่ด้านล่าง ขณะที่ผู้ใช้เลื่อนขึ้นไปอ่านข้อความเก่า
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  // มือถือ: กล่องแชทอยู่นอกจอไหม + จำนวนข้อความที่เข้ามาตอนมองไม่เห็น
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const list = listRef.current;
    if (!list) return;
    // ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหว: เลื่อนทันทีไม่ต้องค่อย ๆ เลื่อน
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top: list.scrollHeight, behavior: prefersReducedMotion ? "auto" : behavior });
    setHasNewMessagesBelow(false);
  };

  const handleListScroll = () => {
    const list = listRef.current;
    if (!list) return;
    isNearBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
    if (isNearBottomRef.current) setHasNewMessagesBelow(false);
  };

  // มีข้อความใหม่: อยู่ล่างสุดหรือเป็นข้อความของเราเอง → เลื่อนลง / ไม่งั้นขึ้นปุ่ม "ข้อความใหม่"
  useLayoutEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.id === lastMessageIdRef.current) return;

    const isFirstLoad = lastMessageIdRef.current === null;
    lastMessageIdRef.current = lastMessage.id;

    // คำใบ้ที่เราส่งเองก็นับเป็นข้อความของเรา (ไม่ขึ้น badge ให้ตัวเอง)
    const isMine = (lastMessage.type === "player" || lastMessage.type === "clue") && lastMessage.userId === myUserId;
    if (isFirstLoad || isMine || isNearBottomRef.current) {
      // กล่องแชทอยู่นอกจอ ไม่ต้องค่อย ๆ เลื่อน (มองไม่เห็นอยู่แล้ว)
      scrollToBottom(isFirstLoad || !isPanelVisible ? "auto" : "smooth");
    } else {
      setHasNewMessagesBelow(true);
    }

    // นับข้อความของคนอื่น (รวมคำใบ้ใหม่) ที่เข้ามาตอนกล่องแชทอยู่นอกจอ (ใช้กับปุ่มลอยบนมือถือ)
    const isCountedAsUnread = lastMessage.type === "player" || lastMessage.type === "clue";
    if (!isFirstLoad && !isMine && isCountedAsUnread && !isPanelVisible) {
      setUnreadCount((count) => count + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // ดูว่ากล่องแชทอยู่ในจอหรือไม่ เห็นแล้วล้างจำนวนที่ยังไม่อ่าน
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsPanelVisible(entry.isIntersecting);
      if (entry.isIntersecting) setUnreadCount(0);
    }, { threshold: 0.2 });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending || isClueGiver) return;

    setIsSending(true);
    const response = await sendMessage(text);
    setIsSending(false);

    if (response.success) {
      setDraft("");
      setSendError(null);
    } else {
      setSendError(response.message ?? "ส่งไม่สำเร็จ");
    }
  };

  // ปุ่มลอยบนมือถือ: เลื่อนหน้าไปที่แชท และให้เห็นข้อความล่าสุดทันที
  const handleJumpToChat = () => {
    scrollToBottom("auto");
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <>
      <section
        ref={panelRef}
        aria-label="แชท"
        className={clsx(
          "flex flex-col rounded-[1.75rem] border-[3px] border-clayEdge bg-surface shadow-clay",
          className
        )}
      >
        <header className="flex items-center gap-3 px-4 pt-4 sm:px-5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-[3px] border-clayEdge bg-mediumYellow text-darkBrown shadow-clay-sm"
          >
            <MessageSquare size={20} />
          </span>
          <h2 className="text-xl font-medium text-lightBrown">แชท</h2>
        </header>

        <div className="relative mt-3 min-h-0 flex-1">
          <ol
            ref={listRef}
            role="log"
            aria-label="ข้อความในแชท"
            onScroll={handleListScroll}
            className="flex h-full flex-col gap-2.5 overflow-y-auto px-3 pb-2 sm:px-4"
          >
            {messages.length === 0 && (
              <li className="m-auto text-center text-sm text-muted">ยังไม่มีข้อความ เริ่มทักทายกันได้เลย</li>
            )}
            {messages.map((message) => {
              const sender = message.type === "player" || message.type === "clue" ? gameState.users.find((user) => user.userId === message.userId) : undefined;
              return (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  isMine={message.type === "player" && message.userId === myUserId}
                  senderTeam={sender?.team}
                  isSenderHost={message.type === "player" && message.userId === gameState.hostId}
                  isSenderClueGiver={message.type === "player" && message.userId === gameState.clueGiver}
                />
              );
            })}
          </ol>

          {hasNewMessagesBelow && (
            <button
              type="button"
              onClick={() => scrollToBottom()}
              className="absolute bottom-2 left-1/2 flex min-h-[36px] -translate-x-1/2 cursor-pointer items-center gap-1 rounded-full border-2 border-clayEdge bg-mediumYellow px-3 text-sm font-medium text-darkBrown shadow-clay-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60"
            >
              ข้อความใหม่
              <ArrowDown size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t-2 border-clayEdge/60 px-3 pb-3 pt-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <InputText
                aria-label="พิมพ์ข้อความแชท"
                value={draft}
                maxLength={CHAT_MESSAGE_MAX_LENGTH}
                disabled={isClueGiver}
                placeholder={isClueGiver ? "คนให้คำใบ้พิมพ์แชทไม่ได้" : "พิมพ์ข้อความ..."}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setSendError(null);
                }}
                className="disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <IconButton
              type="submit"
              variant="primary"
              aria-label="ส่งข้อความ"
              disabled={isClueGiver || isSending || !draft.trim()}
            >
              <Send size={18} aria-hidden="true" />
            </IconButton>
          </div>
          {isClueGiver && (
            <p className="mt-1.5 text-xs text-muted">คุณเป็นคนให้คำใบ้ อ่านแชทได้แต่พิมพ์ไม่ได้ (กันใบ้เพิ่มทางแชท)</p>
          )}
          {sendError && (
            <p role="alert" className="mt-1.5 text-xs text-teamBText">
              {sendError}
            </p>
          )}
        </form>
      </section>

      {/* มือถือ: ปุ่มลอยพาไปที่แชท (แสดงเมื่อกล่องแชทอยู่นอกจอ) */}
      {!isPanelVisible && (
        <button
          type="button"
          onClick={handleJumpToChat}
          aria-label={unreadCount > 0 ? `ไปที่แชท มีข้อความใหม่ ${unreadCount} ข้อความ` : "ไปที่แชท"}
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-[3px] border-clayEdge bg-mediumYellow text-darkBrown shadow-clay transition-transform duration-150 active:translate-y-[3px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60 lg:hidden"
        >
          <MessageSquare size={24} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full border-2 border-clayEdge bg-teamB px-1 font-sans text-xs font-bold tabular-nums text-ink">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
};

export default ChatPanel;
