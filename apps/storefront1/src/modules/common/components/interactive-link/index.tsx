import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import LocalizedClientLink from "../localized-client-link"

type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      href={href}
      onClick={onClick}
      className="group inline-flex items-center gap-1"
      {...props}
    >
      <Text className="text-ui-fg-interactive">{children}</Text>
      <span className="text-ui-fg-interactive transition-transform duration-150 group-hover:rotate-45">
        <ArrowUpRightMini />
      </span>
    </LocalizedClientLink>
  )
}

export default InteractiveLink
