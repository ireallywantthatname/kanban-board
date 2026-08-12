"use client";

import { useEffect, useState } from "react";

function formatNow(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Clock() {
  const [time, setTime] = useState(() => formatNow(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTime(formatNow(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="taskbar-clock" title={new Date().toLocaleString()}>
      <span>{time}</span>
    </div>
  );
}
