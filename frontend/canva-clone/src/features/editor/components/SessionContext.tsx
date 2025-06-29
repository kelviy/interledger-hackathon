import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from "react";

// Generic hook to persist state in sessionStorage
function useSessionStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch {}
  }, [key, storedValue]);
  return [storedValue, setStoredValue];
}

type SessionContextType = {
  timeElapsed: number;
  setTimeElapsed: React.Dispatch<React.SetStateAction<number>>;
  isPremium: boolean;
  setIsPremium: (b: boolean) => void;
  isPaused: boolean;
  setIsPaused: (b: boolean) => void;
  amount:number;
  setAmount:(n:number)=>void;
  sessionBudget: number;
  setSessionBudget: Dispatch<SetStateAction<number>>;
  remainingBudget: number;
  setRemainingBudget: Dispatch<SetStateAction<number>>;
  currentSessionId: number | null;
  setCurrentSessionId: Dispatch<SetStateAction<number | null>>;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPremium, setIsPremium] = useSessionStorage<boolean>("isPremium", false);
  const [isPaused, setIsPaused] = useState(false);
  const [amount, setAmount] = useState(0);
  const [sessionBudget, setSessionBudget] = useSessionStorage<number>("sessionBudget", 0);
  const [remainingBudget, setRemainingBudget] = useSessionStorage<number>("remainingBudget", 0);
  const [currentSessionId, setCurrentSessionId] = useSessionStorage<number | null>("currentSessionId", null);
  return (
    <SessionContext.Provider value={{ 
                                      timeElapsed, setTimeElapsed, 
                                      isPremium, setIsPremium, 
                                      isPaused, setIsPaused, 
                                      amount, setAmount,
                                      sessionBudget, setSessionBudget,
                                      remainingBudget, setRemainingBudget,
                                      currentSessionId, setCurrentSessionId,
    }}>
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
