enum ItemStatusE {
  TODO,
  IN_PROGRESS,
  DONE,
}

const ITEM_STATUS_LABELS: Record<ItemStatusE, string> = {
  [ItemStatusE.TODO]: "To Do",
  [ItemStatusE.IN_PROGRESS]: "In Progress",
  [ItemStatusE.DONE]: "Done",
};

type ItemT = {
  id: string;
  boardId: string;
  title: string;
  description: string;
  status: ItemStatusE;
  createdAt: string;
  modifiedAt: string;
};

export type { ItemT };
export { ItemStatusE, ITEM_STATUS_LABELS };
