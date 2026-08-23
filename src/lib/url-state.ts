import { createParser, parseAsArrayOf, parseAsString } from "nuqs";
import { isPersistableWindowId, type PersistableWindowId } from "@/lib/windows";

export const parseAsWindowId = createParser({
  parse(query) {
    if (!isPersistableWindowId(query)) return null;
    return query;
  },
  serialize(value: PersistableWindowId) {
    return value;
  },
});

export const desktopSearchParams = {
  open: parseAsArrayOf(parseAsWindowId, ",").withOptions({
    history: "push",
    shallow: true,
  }),
  focus: parseAsWindowId.withOptions({
    history: "push",
    shallow: true,
  }),
  q: parseAsString.withDefault("").withOptions({
    clearOnDefault: true,
    throttleMs: 200,
    history: "replace",
  }),
};
