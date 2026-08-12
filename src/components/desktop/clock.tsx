"use client";

import { useEffect, useState } from "react";

function formatNow(date: Date) {
  const time = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const day = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return { time, day };
}

export function Clock() {
  const [now, setNow] = useState(() => formatNow(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(formatNow(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="win-sunken flex min-w-[120px] flex-col items-end px-2 py-0.5 leading-tight">
      <span>{now.time}</span>
      <span className="text-[15px]">{now.day}</span>
    </div>
  );
}
