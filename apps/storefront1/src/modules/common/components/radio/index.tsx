import { clx } from "@medusajs/ui"

const Radio = ({
  checked,
  'data-testid': dataTestId,
}: {
  checked: boolean
  'data-testid'?: string
}) => {
  return (
    <span
      data-testid={dataTestId || "radio-button"}
      className={clx(
        "flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-base transition",
        checked && "border-ui-border-interactive"
      )}
    >
      <span
        className={clx(
          "h-2.5 w-2.5 rounded-full transition",
          checked ? "bg-primary" : "bg-transparent"
        )}
      />
    </span>
  )
}

export default Radio
