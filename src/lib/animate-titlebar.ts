export type TitlebarRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type AnimateTitlebarOptions = {
  title: string;
  iconHtml?: string;
  active?: boolean;
  durationMs?: number;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function rectFromElement(el: Element | null): TitlebarRect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  };
}

export function animateTitlebar(
  from: TitlebarRect,
  to: TitlebarRect,
  opts: AnimateTitlebarOptions,
): Promise<void> {
  if (prefersReducedMotion()) {
    return Promise.resolve();
  }

  const durationMs = opts.durationMs ?? 200;
  const durationStr = `${durationMs}ms`;

  const el = document.createElement("div");
  el.className = `title-bar titlebar-fly${opts.active === false ? " inactive" : ""}`;
  el.setAttribute("aria-hidden", "true");

  const text = document.createElement("div");
  text.className = "title-bar-text";
  if (opts.iconHtml) {
    const icon = document.createElement("span");
    icon.className = "app-window-icon";
    icon.innerHTML = opts.iconHtml;
    text.appendChild(icon);
  }
  const label = document.createElement("span");
  label.textContent = opts.title;
  text.appendChild(label);
  el.appendChild(text);

  Object.assign(el.style, {
    position: "fixed",
    zIndex: "10000000",
    pointerEvents: "none",
    margin: "0",
    boxSizing: "border-box",
    overflow: "hidden",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    transition: `left ${durationStr} linear, top ${durationStr} linear, width ${durationStr} linear, height ${durationStr} linear`,
  });

  document.body.appendChild(el);

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("transitionend", onEnd);
      el.removeEventListener("transitioncancel", onEnd);
      window.clearTimeout(fallback);
      el.remove();
      resolve();
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el) return;
      finish();
    };

    el.addEventListener("transitionend", onEnd);
    el.addEventListener("transitioncancel", onEnd);
    const fallback = window.setTimeout(finish, durationMs * 1.2);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.left = `${to.left}px`;
        el.style.top = `${to.top}px`;
        el.style.width = `${to.width}px`;
        el.style.height = `${to.height}px`;
      });
    });
  });
}

export function windowTitlebarEl(boardId: string): HTMLElement | null {
  return document.querySelector(`[data-window-id="${boardId}"] .title-bar`);
}

export function taskbarButtonEl(boardId: string): HTMLElement | null {
  return document.querySelector(`[data-taskbar-window="${boardId}"]`);
}

export function titlebarIconHtml(boardId: string): string | undefined {
  const icon = document.querySelector(
    `[data-window-id="${boardId}"] .title-bar .app-window-icon`,
  );
  return icon ? icon.innerHTML : undefined;
}

export function waitFrames(n = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
