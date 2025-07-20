import Lobby from "@/screen/Lobby";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <Lobby />
    </Suspense>)
}
