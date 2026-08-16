import KanbanGrid from "@/components/app/kanban-grid";

import items from "@/tests/data/items.json";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <KanbanGrid items={items} />
    </main>
  );
}
