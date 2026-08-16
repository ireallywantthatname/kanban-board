import KanbanBoard from "@/components/app/kanban-board";

import type { ItemT } from "@/types/item";

export default function KanbanGrid({ items }: { items: ItemT[] }) {
  return (
    <div>
      <h1>Kanban Board</h1>
      <KanbanBoard items={items} />
    </div>
  );
}
