import type { Preview } from "@storybook/react-vite";

import "../src/shell/game-shell.css";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    controls: { expanded: true },
  },
};

export default preview;
