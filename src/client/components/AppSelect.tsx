import * as Select from "@radix-ui/react-select";
import styles from "./AppSelect.module.css";

type Option = { value: string; label: string };
type Props = { value: string; onValueChange: (value: string) => void; options: Option[]; label: string; placeholder?: string };

// Renders an accessible, touch-friendly Radix selection control with consistent shop styling.
export function AppSelect({ value, onValueChange, options, label, placeholder = "Choose one" }: Props) {
  return <label className={styles.field}><span>{label}</span><Select.Root value={value} onValueChange={onValueChange}>
    <Select.Trigger className={styles.trigger} aria-label={label}><Select.Value placeholder={placeholder} /><Select.Icon>⌄</Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content className={styles.content} position="popper" sideOffset={4}><Select.Viewport>
      {options.map((option) => <Select.Item key={option.value} value={option.value} className={styles.item}><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator>✓</Select.ItemIndicator></Select.Item>)}
    </Select.Viewport></Select.Content></Select.Portal>
  </Select.Root></label>;
}