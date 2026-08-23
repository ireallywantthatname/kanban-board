import { Suspense } from "react";
import { BootScreen } from "@/components/desktop/boot-screen";
import { DesktopShell } from "@/components/desktop/desktop-shell";

export default function Home() {
  return (
    <main className="h-full w-full">
      <Suspense fallback={<BootScreen />}>
        <DesktopShell />
      </Suspense>
    </main>
  );
}
