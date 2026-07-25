import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./january/january-runtime.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Runtime Human root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
