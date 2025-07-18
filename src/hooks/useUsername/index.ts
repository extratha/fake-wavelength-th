// hooks/useUsername.ts
import { useEffect, useState } from "react";

export const useUsername = () => {
  const [username, setUsernameState] = useState<string>("");

  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) {
      setUsernameState(name);
    }
  }, []);

  const setUsername = (name: string) => {
    localStorage.setItem("username", name);
    setUsernameState(name);
  };

  return { username, setUsername };
};
