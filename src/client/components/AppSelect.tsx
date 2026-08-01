import { useId, useState } from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./Select.module.css";

type Option = { value: string; label: string };
type Props = { value: string; onValueChange: (value: string) => void; options: Option[]; label: string; placeholder?: string };

// Renders an accessible, touch-friendly Radix selection control with consistent shop styling.
export function AppSelect({ value, onValueChange, options, label, placeholder = "Choose one" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const labelId = useId();

  // Closes the controlled menu immediately after a touch or keyboard selection.
  function handleValueChange(nextValue: string) {
    onValueChange(nextValue);
    setIsOpen(false);
  }

  return <div className={styles.field}>
    <span className={styles.label} id={labelId}>{label}</span>
    <Select.Root open={isOpen} onOpenChange={setIsOpen} value={value} onValueChange={handleValueChange}>
      <Select.Trigger className={styles.trigger} aria-labelledby={labelId}><Select.Value placeholder={placeholder} /><Select.Icon className={styles.icon} aria-hidden="true">⌄</Select.Icon></Select.Trigger>
      <Select.Portal><Select.Content className={styles.content} position="popper" sideOffset={6} collisionPadding={16}><Select.Viewport className={styles.viewport}>
        {options.map((option) => <Select.Item key={option.value} value={option.value} className={styles.item}><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator className={styles.indicator}>✓</Select.ItemIndicator></Select.Item>)}
      </Select.Viewport></Select.Content></Select.Portal>
    </Select.Root>
  </div>;
}
