import type { Metadata } from "next";
import GameShell from "@/src/game/ui/GameShell";

export const metadata: Metadata = {
  title: "Mission Control — Orbital Architect",
  description:
    "Build and fly launch vehicles in a deterministic NASA-style ascent simulation.",
};

export default function GamePage() {
  return <GameShell />;
}
