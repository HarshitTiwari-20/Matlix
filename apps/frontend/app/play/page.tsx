import type { Metadata } from "next";
import { PlayArena } from "../../components/PlayArena";

export const metadata: Metadata = {
  title: "Arena",
  description: "Your live 1v1 mental math arena.",
};

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col">
      <PlayArena />
    </main>
  );
}
