"use client";

import { useEffect, useState } from "react";

type EventCountdownProps = {
  startAt: string;
};

function getRemainingParts(startAt: string) {
  const diff = Math.max(new Date(startAt).getTime() - Date.now(), 0);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];
}

export function EventCountdown({ startAt }: EventCountdownProps) {
  const [remaining, setRemaining] = useState(() => getRemainingParts(startAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(getRemainingParts(startAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startAt]);

  const hasStarted = remaining.every((part) => part.value === 0);

  return (
    <div className="rounded-[1.75rem] bg-[#250707] px-6 py-7 text-center text-white">
      <p className="text-[0.72rem] uppercase tracking-[0.2em] text-white/65">Event Countdown</p>
      <p className="mt-3 text-3xl font-[family:var(--font-title)] uppercase leading-none">
        {hasStarted ? "The event is live!" : "The event is coming soon!"}
      </p>
      <div className="mt-5 grid grid-cols-4 gap-3">
        {remaining.map((part) => (
          <div key={part.label}>
            <div className="text-3xl font-semibold tabular-nums">{String(part.value).padStart(2, "0")}</div>
            <div className="text-[0.7rem] uppercase tracking-[0.16em] text-white/70">{part.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
