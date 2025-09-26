import { listRegions } from "@lib/data/regions"
import { listNavigation } from "@lib/data/navigation"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import ScrollNavbar from "@modules/layout/components/scroll-navbar"

interface NavProps {
  cart?: HttpTypes.StoreCart | null
}

export default async function Nav({ cart }: NavProps) {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)
  const navigation = await listNavigation()

  return (
    <div className="relative z-50 w-full">
      <ScrollNavbar regions={regions} navigationItems={navigation} cart={cart} />
    </div>
  )
}
