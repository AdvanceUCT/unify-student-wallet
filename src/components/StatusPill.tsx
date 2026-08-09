import { Tag } from "./Tag";

type StatusPillProps = {
  label: string;
  tone?: "success" | "warning" | "error" | "ink";
};

export function StatusPill({ label, tone = "success" }: StatusPillProps) {
  return <Tag label={label} tone={tone} />;
}
