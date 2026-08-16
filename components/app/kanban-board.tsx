"use client";

import { useEffect, useRef } from "react";
import { createSwapy } from "swapy";

import KanbanItem from "@/components/app/kanban-item";

import type { ItemT } from "@/types/item";

export default function KanbanBoard({ items }: { items: ItemT[] }) {
  const swapy = useRef(null);
  const container = useRef(null);

  useEffect(() => {
    // If container element is loaded
    if (container.current) {
      swapy.current = createSwapy(container.current);
      // Your event listeners
      swapy.current.onSwap((event) => {
        console.log("swap", event);
      });
    }

    return () => {
      // Destroy the swapy instance on component destroy
      swapy.current?.destroy();
    };
  }, []);

  return (
    <div ref={container}>
      {items.map((item) => (
        <KanbanItem key={item.id} {...item} />
      ))}
    </div>
  );
}
