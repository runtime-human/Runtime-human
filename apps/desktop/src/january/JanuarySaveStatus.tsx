import type { JanuarySessionView } from "./january-session-controller";
import {
  januarySaveStatusDetail,
  januarySaveStatusLabel,
  projectJanuarySaveStatus,
} from "./january-save-status";

export type JanuarySaveStatusProps = Readonly<{
  view: JanuarySessionView;
  busy: boolean;
}>;

/** Text plus a dot; meaning never relies on colour alone. Live region lives in DesktopShell. */
export function JanuarySaveStatus({ view, busy }: JanuarySaveStatusProps) {
  const status = projectJanuarySaveStatus(view, busy);
  return (
    <strong
      className="runtime-save-status"
      data-save-state={status.kind}
      title={januarySaveStatusDetail(status)}
    >
      <span aria-hidden="true" className="runtime-save-status-dot" />
      <span>{januarySaveStatusLabel(status)}</span>
    </strong>
  );
}
