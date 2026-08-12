"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type StartMenuProps = {
  open: boolean;
  onClose: () => void;
};

export function StartMenu({ open, onClose }: StartMenuProps) {
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="win-raised absolute bottom-full left-0 mb-0.5 flex w-56 flex-col"
    >
      <div className="flex items-stretch">
        <div className="flex w-8 items-end justify-center bg-gradient-to-b from-[#000080] to-[#1084d0] pb-2">
          <span className="rotate-180 text-[14px] tracking-widest text-white [writing-mode:vertical-rl]">
            Kanban Board
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-2">
          <div className="break-all text-[16px]">
            {user?.email ?? user?.name ?? "User"}
          </div>
          <Button
            type="button"
            onClick={() => {
              void signOut();
              onClose();
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
