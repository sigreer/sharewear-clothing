import { Label } from "@medusajs/ui"
import React, { useEffect, useImperativeHandle, useState } from "react"
import { Input as ShadcnInput } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import Eye from "@modules/common/icons/eye"
import EyeOff from "@modules/common/icons/eye-off"

// Custom PasswordInput component for ShadCN
const PasswordInput = React.forwardRef<HTMLInputElement, any>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    const { className, ...rest } = props

    return (
      <div className="relative">
        <ShadcnInput
          {...rest}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          aria-label="Toggle password visibility"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    )
  }
)

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, name, label, touched, required, topLabel, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {topLabel && (
          <Label className="txt-compact-medium-plus">
            {topLabel}
          </Label>
        )}

        {type === "password" ? (
          <PasswordInput
            name={name}
            placeholder={label + (required ? " *" : "")}
            required={required}
            className={cn("h-11 bg-muted border-border hover:bg-accent/50 focus:ring-ring", className)}
            {...props}
            ref={ref}
          />
        ) : (
          <ShadcnInput
            type={type}
            name={name}
            placeholder={label + (required ? " *" : "")}
            required={required}
            className={cn("h-11 bg-muted border-border hover:bg-accent/50 focus:ring-ring", className)}
            {...props}
            ref={ref}
          />
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
