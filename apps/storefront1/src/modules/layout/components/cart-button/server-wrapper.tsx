import { retrieveCart } from "@lib/data/cart"
import CartDropdown from "../cart-dropdown"

interface CartButtonProps {
  merged?: boolean
}

export default async function CartButtonServerWrapper({ merged = false }: CartButtonProps) {
  const cart = await retrieveCart().catch(() => null)

  return <CartDropdown cart={cart} merged={merged} />
}