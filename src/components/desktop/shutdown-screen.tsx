"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ShutdownScreenProps = {
  onPowerOn: () => void;
};

export function ShutdownScreen({ onPowerOn }: ShutdownScreenProps) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setDone(true), 1000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <button type="button" className="shutdown-overlay" onClick={onPowerOn}>
      <Image
        src={done ? "/img/shutdown.png" : "/img/shuttingdown.png"}
        alt={
          done
            ? "It is now safe to turn off your computer"
            : "Windows is shutting down"
        }
        fill
        unoptimized
        className="shutdown-overlay-image"
        preload
      />
    </button>
  );
}
