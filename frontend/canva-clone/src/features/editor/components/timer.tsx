// Timer.tsx
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSessionEditor } from "./SessionContext";

export default function Timer() {
  const {
    isPremium,
    timeElapsed,
    setTimeElapsed,
    sessionBudget,
    setRemainingBudget,
    setIsPremium,
    currentSessionId,
  } = useSessionEditor();

  // 1) Poll the server for used budget every second, but only
  //    after the previous fetch completes
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isPremium || currentSessionId === null) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    async function poll() {
      try {
        const res = await fetch(
          `http://localhost:8000/payment/?session_id=${currentSessionId}`,
          { headers: { "Content-Type": "application/json" } }
        );
        const { total_amount } = (await res.json()) as {
          total_amount: { total: number };
        };
        // total_amount.total is in cents, so convert to rands:
        const usedRands = total_amount.total / 100;
        const newRemaining = sessionBudget - usedRands;
        setRemainingBudget(Math.max(0, newRemaining));
        if (newRemaining <= 0) {
          setIsPremium(false);
        }
      } catch (e) {
        console.error("Polling error", e);
      } finally {
        timeoutRef.current = setTimeout(poll, 1000);
      }
    }

    poll();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    isPremium,
    currentSessionId,
    sessionBudget,
    setRemainingBudget,
    setIsPremium,
  ]);

  // 2) Increment the elapsed‐time counter once a second
  useEffect(() => {
    if (!isPremium) return;
    const timerId = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [isPremium, setTimeElapsed]);

  // 3) Format MM:SS
  const formatTime = (total: number) => {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // 4) Render a disabled secondary button showing the ticking clock
  return isPremium ? (
    <Button variant="secondary" disabled>
      <p>{formatTime(timeElapsed)}</p>
    </Button>
  ) : null;
}