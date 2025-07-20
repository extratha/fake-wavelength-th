import { UserProfileReactContext } from "@/context/UserProfileContext"
import { useContext } from "react"


export const useUserProfile = () => {
  const context = useContext(UserProfileReactContext)
  if (!context) throw new Error('useUserProfile must be used within UserProfileProvider')
  return context
}
