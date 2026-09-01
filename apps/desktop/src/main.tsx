import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./shell/game-shell.css";
import "./shell/bottom-game-dock.css";
import "./overview/career-overview.css";
import "./january/january-runtime.css";
import { RUNTIME_RENDERER_MILESTONES } from "./performance/renderer-milestones.js";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Runtime Human root element was not found");

RUNTIME_RENDERER_MILESTONES.mark("app.renderer_bootstrap");
createRoot(rootElement).render(
  <StrictMode>
    <App rendererMilestones={RUNTIME_RENDERER_MILESTONES} />
  </StrictMode>,
);
