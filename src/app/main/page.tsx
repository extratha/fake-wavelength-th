'use client'

import MainScreen from '@/screen/Main'
import { Suspense } from 'react'

export default function MainPage() {

  return (<Suspense fallback={<div>กำลังโหลด...</div>}> <MainScreen /></Suspense>)
}
