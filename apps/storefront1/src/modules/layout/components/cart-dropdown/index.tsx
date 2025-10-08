"use client"

import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { ShoppingBasket } from "lucide-react"
import { Button as ShadcnButton } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const CartDropdown = ({
  cart: cartState,
  merged = false,
  mobile = false,
}: {
  cart?: HttpTypes.StoreCart | null
  merged?: boolean
  mobile?: boolean
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)
  const [hasOpened, setHasOpened] = useState(false)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart") && !hasOpened) {
      timedOpen()
      setHasOpened(true)
    }
    itemRef.current = totalItems
  }, [totalItems, pathname, hasOpened])

  // Reset hasOpened when pathname changes
  useEffect(() => {
    setHasOpened(false)
  }, [pathname])

  return (
    <div
      className="h-full flex items-center z-[1100]"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover open={cartDropdownOpen} onOpenChange={setCartDropdownOpen}>
        <PopoverTrigger asChild>
          <div className="relative flex h-full items-center">
            <ShadcnButton
              asChild
              variant="ghost"
              className={cn(
                "relative rounded-lg transition-colors",
                mobile
                  ? "h-auto w-auto p-0 bg-transparent hover:bg-transparent text-primary-foreground hover:text-primary-foreground/80 flex items-center justify-center"
                  : "h-8 w-8 p-0",
                !mobile && merged
                  ? "text-white hover:bg-white hover:text-primary"
                  : !mobile && !merged
                  ? "text-foreground-secondary hover:bg-primary hover:text-primary-foreground"
                  : ""
              )}
              aria-label={`Cart with ${totalItems} items`}
              data-testid="nav-cart-link"
            >
              <LocalizedClientLink href="/cart" className={mobile ? "flex items-center justify-center" : ""}>
                <ShoppingBasket size={mobile ? 28 : 22} strokeWidth={1.8} />
                {totalItems > 0 && (
                  <span className={cn(
                    "absolute flex items-center justify-center rounded-full bg-red-500 font-bold text-white",
                    mobile
                      ? "-top-1 -right-1 h-5 w-5 text-xs"
                      : "-top-0.5 -right-0.5 h-[18px] w-[18px] text-xs"
                  )}>
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </LocalizedClientLink>
            </ShadcnButton>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="hidden sm:block w-[420px] p-0 bg-background text-text shadow-xl z-[1100]"
          align="end"
          data-testid="nav-cart-dropdown"
        >
          <div className="p-4 flex items-center justify-center">
            <h3 className="text-large-semi font-semibold">Cart</h3>
          </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto max-h-[402px] px-4 no-scrollbar">
                  <div className="space-y-8 flex flex-col">
                    {cartState.items
                      .sort((a, b) => {
                        return (a.created_at ?? "") > (b.created_at ?? "")
                          ? -1
                          : 1
                      })
                      .map((item) => (
                        <div
                          className="grid grid-cols-[122px_1fr] gap-4"
                          key={item.id}
                          data-testid="cart-item"
                        >
                          <LocalizedClientLink
                            href={`/products/${item.product_handle}`}
                          >
                            <div className="w-24">
                              <Thumbnail
                                thumbnail={item.thumbnail}
                                images={item.variant?.product?.images}
                                size="square"
                              />
                            </div>
                          </LocalizedClientLink>
                          <div className="flex flex-col justify-between flex-1">
                            <div className="flex-1 space-y-2 flex flex-col">
                              <div className="flex items-start justify-between">
                                <div className="mr-4 w-[180px] overflow-hidden whitespace-nowrap space-y-1 flex flex-col">
                                  <h3 className="text-base-regular overflow-hidden text-ellipsis">
                                    <LocalizedClientLink
                                      href={`/products/${item.product_handle}`}
                                      data-testid="product-link"
                                    >
                                      {item.title}
                                    </LocalizedClientLink>
                                  </h3>
                                  <LineItemOptions
                                    variant={item.variant}
                                    data-testid="cart-item-variant"
                                    data-value={item.variant}
                                  />
                                  <span
                                    className="text-sm text-muted-foreground"
                                    data-testid="cart-item-quantity"
                                    data-value={item.quantity}
                                  >
                                    Quantity: {item.quantity}
                                  </span>
                                </div>
                                <div className="flex justify-end">
                                  <LineItemPrice
                                    item={item}
                                    style="tight"
                                    currencyCode={cartState.currency_code}
                                  />
                                </div>
                              </div>
                            </div>
                            <DeleteButton
                              id={item.id}
                              className="mt-1"
                              data-testid="cart-item-remove-button"
                            >
                              Remove
                            </DeleteButton>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="p-4 space-y-4 text-small-regular">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold">
                      Subtotal{" "}
                      <span className="font-normal">(excl. taxes)</span>
                    </span>
                    <span
                      className="text-large-semi font-semibold"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      Go to cart
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div className="py-16 space-y-4 flex flex-col items-center justify-center">
                <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-small-regular font-semibold">
                  0
                </div>
                <span className="text-foreground">Your shopping bag is empty.</span>
                <LocalizedClientLink href="/store">
                  <div>
                    <span className="sr-only">Go to all products page</span>
                    <Button onClick={close}>Explore products</Button>
                  </div>
                </LocalizedClientLink>
              </div>
            )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default CartDropdown
