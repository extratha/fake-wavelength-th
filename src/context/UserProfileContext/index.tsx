'use client'

import { createContext, useState, ReactNode, useEffect } from 'react'

type UserProfile = {
  userName: string
  roomId?: string
  userId?: string
  isClueGiver?: boolean
}

type UserProfileContextType = {
  profile: UserProfile
  updateProfile: (newProfile: Partial<UserProfile>) => void
  clearProfile: () => void
  profileReady: boolean
}

const LOCAL_STORAGE_KEY = 'userProfile'

export const UserProfileReactContext = createContext<UserProfileContextType | undefined>(undefined);

const getInitialProfile = (): UserProfile => {
  if (typeof window !== 'undefined') {
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedProfile) {
      try {
        return JSON.parse(storedProfile)
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }
  }
  return { userName: '' } 
}

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile)
  const [profileReady, setProfileReady] = useState(false)

  useEffect(() => {
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedProfile) {
      try {
        const parsedProfile = JSON.parse(storedProfile)
        setProfile(parsedProfile)
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }
    setProfileReady(true)
  }, [])

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile(prev => {
      const updatedProfile = { ...prev, ...newProfile }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProfile))
      return updatedProfile
    })
  }

  const clearProfile = () => {
    setProfile({ userName: '' })
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }

  return (
    <UserProfileReactContext.Provider value={{ profile, updateProfile, clearProfile, profileReady }}>
      {children}
    </UserProfileReactContext.Provider>
  )
}
