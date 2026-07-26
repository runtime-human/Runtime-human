import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./design/runtime-human-tokens.css";
import "./shell/desktop-shell.css";
import "./january/january-runtime.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Runtime Human root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
