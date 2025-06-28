import { createContext, useContext, useState, ReactNode } from "react";

type SessionContextType = {
  timeElapsed: number;
  setTimeElapsed: (n: number) => void;
  isPremium: boolean;
  setIsPremium: (b: boolean) => void;
  isPaused: boolean;
  setIsPaused: (b: boolean) => void;
  amount:number;
  setAmount:(n:number)=>void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [amount, setAmount] = useState(0);
  return (
    <SessionContext.Provider value={{ timeElapsed, setTimeElapsed, isPremium, setIsPremium, isPaused, setIsPaused, amount, setAmount}}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook for easy use
export function useSessionEditor() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
