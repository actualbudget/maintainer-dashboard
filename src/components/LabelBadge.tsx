import type { PRLabel } from "../types";

interface LabelBadgeProps {
  label: PRLabel;
}

export default function LabelBadge({ label }: LabelBadgeProps) {
  const bg = `#${label.color}`;

  return (
    <span
      className="inline-block rounded-md px-1.5 py-px text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: `${bg}30`, color: bg, borderLeft: `2px solid ${bg}` }}
    >
      {label.name}
    </span>
  );
}
