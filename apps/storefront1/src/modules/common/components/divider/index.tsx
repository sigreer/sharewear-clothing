import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

const Divider = ({ className }: { className?: string }) => (
  <Separator
    className={cn("border-border mt-1", className)}
  />
)

export default Divider
