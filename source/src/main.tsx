// Orca panel entry: mounts the game client-side only.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TetrisApp } from "@/components/game/TetrisApp";
import "./orca-panel.css";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <TetrisApp />
  </StrictMode>,
);
