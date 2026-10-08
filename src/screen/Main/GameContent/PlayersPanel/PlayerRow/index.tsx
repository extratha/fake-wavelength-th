import clsx from "clsx";
import { Crown, EllipsisVertical, Target, UserX, X } from "lucide-react";
import IconButton from "@/component/IconButton";

export type PlayerAction = "clueGiver" | "assignHost" | "kick";

type PlayerRowProps = {
  name: string;
  isMe: boolean;
  isPlayerHost: boolean;
  isPlayerClueGiver: boolean;
  // host ของห้องเท่านั้นที่เห็นปุ่ม ⋮
  canManage: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onAction: (action: PlayerAction) => void;
};

const MENU_ITEM_CLASS =
  "flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mediumYellow/60";

// แถวชื่อผู้เล่น 1 คน + เมนูจัดการของ host (เปิดจากปุ่ม ⋮)
const PlayerRow = ({
  name,
  isMe,
  isPlayerHost,
  isPlayerClueGiver,
  canManage,
  isMenuOpen,
  onToggleMenu,
  onAction,
}: PlayerRowProps) => {
  return (
    <li>
      <div
        className={clsx(
          "flex min-h-[48px] items-center gap-2 rounded-2xl border-2 px-3 py-1.5 transition-colors duration-150",
          isMenuOpen ? "border-mediumYellow bg-[#4a3529]" : "border-clayEdge bg-surfaceDeep"
        )}
      >
        <span className={clsx("min-w-0 truncate", isMe ? "font-semibold text-lightBrown" : "text-lightBrown")}>
          {name}
        </span>
        {isMe && <span className="shrink-0 text-sm text-muted">(คุณ)</span>}

        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {isPlayerClueGiver && (
            <span title="คนให้คำใบ้" className="flex h-7 w-7 items-center justify-center rounded-full bg-mediumYellow text-darkBrown">
              <Target size={16} aria-hidden="true" />
              <span className="sr-only">คนให้คำใบ้</span>
            </span>
          )}
          {isPlayerHost && (
            <span title="Host" className="flex h-7 w-7 items-center justify-center rounded-full bg-mediumBrown text-ink">
              <Crown size={16} aria-hidden="true" />
              <span className="sr-only">Host</span>
            </span>
          )}
          {canManage && (
            <IconButton
              variant="ghost"
              aria-label={`จัดการ ${name}`}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              onClick={onToggleMenu}
              className="-mr-1"
            >
              {isMenuOpen ? <X size={20} aria-hidden="true" /> : <EllipsisVertical size={20} aria-hidden="true" />}
            </IconButton>
          )}
        </span>
      </div>

      {canManage && isMenuOpen && (
        <div
          role="menu"
          aria-label={`จัดการ ${name}`}
          className="modal-panel-in mt-1.5 rounded-2xl border-2 border-clayEdge bg-surfaceDeep p-1.5 text-lightBrown shadow-clay-sm"
        >
          <button role="menuitem" type="button" className={MENU_ITEM_CLASS} onClick={() => onAction("clueGiver")}>
            <Target size={18} aria-hidden="true" className="text-mediumYellow" />
            ตั้งเป็นคนให้คำใบ้
          </button>
          {!isPlayerHost && (
            <>
              <button role="menuitem" type="button" className={MENU_ITEM_CLASS} onClick={() => onAction("assignHost")}>
                <Crown size={18} aria-hidden="true" className="text-mediumBrown" />
                ตั้งเป็น Host
              </button>
              <button
                role="menuitem"
                type="button"
                className={clsx(MENU_ITEM_CLASS, "text-teamBText")}
                onClick={() => onAction("kick")}
              >
                <UserX size={18} aria-hidden="true" />
                เตะออกจากห้อง
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

export default PlayerRow;
