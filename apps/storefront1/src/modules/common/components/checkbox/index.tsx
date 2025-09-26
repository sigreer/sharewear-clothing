import React from "react"

type CheckboxProps = {
  checked?: boolean
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  name?: string
  'data-testid'?: string
}

const CheckboxWithLabel: React.FC<CheckboxProps> = ({
  checked = true,
  onChange,
  label,
  name,
  'data-testid': dataTestId,
}) => {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground">
      <input
        id={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        name={name}
        data-testid={dataTestId}
        className="h-5 w-5 rounded border border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <span>{label}</span>
    </label>
  )
}

export default CheckboxWithLabel
