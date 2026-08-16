import type { ItemT } from "@/types/item";

export default function KanbanItem(item: ItemT) {
  return (
    <div data-swapy-slot={item.id} key={item.id}>
      <div data-swapy-item={item.id}>
        {item.title} {item.description}
      </div>
    </div>
  );
}
