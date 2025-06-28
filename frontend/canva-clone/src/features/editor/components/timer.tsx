import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useSessionEditor } from "./SessionContext";


export default function Timer(
)
{     
    const {isPremium, isPaused, setIsPaused, timeElapsed, setTimeElapsed} = useSessionEditor()
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (isPremium) {
          intervalRef.current = setInterval(() => {
            setTimeElapsed((prev) => prev + 1);
          }, 1000);
        }

        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
    }, [isPremium]);


    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };


    return (
        <Button variant={"secondary"} disabled={isPremium}>
            <p>{formatTime(timeElapsed)}</p>
        </Button>
    )
}