import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { SelectHTMLAttributes, forwardRef } from "react"

export type NativeSelectProps = {
  placeholder?: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
} & SelectHTMLAttributes<HTMLSelectElement>

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { placeholder = "Select...", defaultValue, className, children, ...props },
    ref
  ) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          defaultValue={defaultValue}
          className={clx(
            "w-full appearance-none rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2 text-sm text-foreground transition-colors hover:bg-ui-bg-field-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
          {...props}
        >
          <option disabled value="">
            {placeholder}
          </option>
          {children}
        </select>
        <ChevronUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    )
  }
)

NativeSelect.displayName = "NativeSelect"

export default NativeSelect
