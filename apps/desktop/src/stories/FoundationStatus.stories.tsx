import type { Meta, StoryObj } from "@storybook/react-vite";

import { FoundationStatus } from "@runtime-human/game-ui";
import {
  foundationLongRussianFixture,
  foundationReadyFixture,
} from "@runtime-human/game-ui-fixtures";

const meta = {
  title: "Foundation/FoundationStatus",
  component: FoundationStatus,
  parameters: { layout: "fullscreen" },
  args: foundationReadyFixture,
} satisfies Meta<typeof FoundationStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Canonical: Story = {};
export const LongRussianText: Story = { args: foundationLongRussianFixture };
