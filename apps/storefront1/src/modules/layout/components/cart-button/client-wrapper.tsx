"use client"

import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../cart-dropdown"
import { useEffect, useState } from "react"

interface CartButtonClientProps {
  merged?: boolean
  initialCart?: HttpTypes.StoreCart | null
}

export default function CartButtonClient({ merged = false, initialCart = null }: CartButtonClientProps) {
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(initialCart)

  return <CartDropdown cart={cart} merged={merged} />
}