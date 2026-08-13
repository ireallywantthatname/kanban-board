export type SoundEvent =
  | "WindowsLogon"
  | "WindowsLogoff"
  | "SystemExit"
  | "SystemExclamation"
  | "Default"
  | "MenuPopup"
  | "Minimize"
  | "Maximize";

const SOUNDS: Record<SoundEvent, string> = {
  WindowsLogon: "/sounds/windows-logon.wav",
  WindowsLogoff: "/sounds/windows-logoff.wav",
  SystemExit: "/sounds/system-exit.wav",
  SystemExclamation: "/sounds/system-exclamation.wav",
  Default: "/sounds/default.wav",
  MenuPopup: "/sounds/menu-popup.wav",
  Minimize: "/sounds/minimize.wav",
  Maximize: "/sounds/maximize.wav",
};

export function playSound(event: SoundEvent) {
  if (typeof window === "undefined") return;
  const audio = new Audio(SOUNDS[event]);
  void audio.play().catch(() => {});
}
