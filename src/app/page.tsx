'use client'
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function Page() {
  const router = useRouter()
  useEffect(()=> {
    router.replace('/lobby')
  },[])
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <div >
        กำลังโหลด..
      </div>
    </Suspense>)
}
