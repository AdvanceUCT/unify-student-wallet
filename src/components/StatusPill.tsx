import { Tag } from "./Tag";

type StatusPillProps = {
  label: string;
  tone?: "success" | "warning" | "error" | "ink";
};

export function StatusPill({ label, tone = "success" }: StatusPillProps) {
  const tagTone = tone === "success" ? "primary" : tone;
  return <Tag label={label} tone={tagTone} />;
}
