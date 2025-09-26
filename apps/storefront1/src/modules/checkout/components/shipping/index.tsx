"use client"

import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Button, Heading, Text, clx } from "@medusajs/ui"
import * as RadioGroup from "@radix-ui/react-radio-group"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => sm.service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => (pricesMap[p.value?.id || ""] = p.value?.amount!))

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)

        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-ui-bg-component">
      <div className="mb-6 flex items-center justify-between">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row items-baseline gap-x-2 text-3xl-regular",
            {
              "pointer-events-none select-none opacity-50":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          Delivery
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive transition-colors hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <Text className="txt-medium font-medium text-ui-fg-base">
              Shipping method
            </Text>
            <Text className="txt-medium mb-4 text-ui-fg-muted">
              How would you like your order delivered
            </Text>
          </div>

          <div data-testid="delivery-options-container">
            <div className="pb-8 pt-2 md:pt-0">
              {hasPickupOptions && (
                <RadioGroup.Root
                  value={showPickupOptions}
                  onValueChange={(value) => {
                    setShowPickupOptions(value as string)
                    const id = _pickupMethods.find(
                      (option) => !option.insufficient_inventory
                    )?.id

                    if (value === PICKUP_OPTION_ON && id) {
                      handleSetShippingMethod(id, "pickup")
                    }
                  }}
                >
                  <RadioGroup.Item
                    value={PICKUP_OPTION_ON}
                    data-testid="delivery-option-radio"
                    className={clx(
                      "mb-2 flex cursor-pointer items-center justify-between rounded-rounded border border-ui-border-base py-4 px-8 text-small-regular transition hover:shadow-borders-interactive-with-active data-[state=checked]:border-ui-border-interactive"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-base data-[state=checked]:border-ui-border-interactive">
                        <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
                      </span>
                      <Text className="text-base-regular">Pick up your order</Text>
                    </div>
                    <Text className="text-ui-fg-base">-</Text>
                  </RadioGroup.Item>
                </RadioGroup.Root>
              )}
              <RadioGroup.Root
                value={shippingMethodId ?? ""}
                onValueChange={(value) =>
                  value && handleSetShippingMethod(value, "shipping")
                }
              >
                {_shippingMethods?.map((option) => {
                  const isDisabled =
                    option.price_type === "calculated" &&
                    !isLoadingPrices &&
                    typeof calculatedPricesMap[option.id] !== "number"

                  return (
                    <RadioGroup.Item
                      key={option.id}
                      value={option.id}
                      data-testid="delivery-option-radio"
                      disabled={isDisabled}
                      className={clx(
                        "mb-2 flex cursor-pointer items-center justify-between rounded-rounded border border-ui-border-base py-4 px-8 text-small-regular transition hover:shadow-borders-interactive-with-active data-[state=checked]:border-ui-border-interactive",
                        {
                          "cursor-not-allowed opacity-60 hover:shadow-none":
                            isDisabled,
                        }
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-base data-[state=checked]:border-ui-border-interactive">
                          <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
                        </span>
                        <Text className="text-base-regular">{option.name}</Text>
                      </div>
                      <Text className="text-ui-fg-base">
                        {option.price_type === "flat" ? (
                          convertToLocale({
                            amount: option.amount!,
                            currency_code: cart?.currency_code,
                          })
                        ) : calculatedPricesMap[option.id] ? (
                          convertToLocale({
                            amount: calculatedPricesMap[option.id],
                            currency_code: cart?.currency_code,
                          })
                        ) : isLoadingPrices ? (
                          <Loader />
                        ) : (
                          "-"
                        )}
                      </Text>
                    </RadioGroup.Item>
                  )
                })}
              </RadioGroup.Root>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <Text className="txt-medium font-medium text-ui-fg-base">
                  Store
                </Text>
                <Text className="txt-medium mb-4 text-ui-fg-muted">
                  Choose a store near you
                </Text>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 pt-2 md:pt-0">
                  <RadioGroup.Root
                    value={shippingMethodId ?? ""}
                    onValueChange={(value) =>
                      value && handleSetShippingMethod(value, "pickup")
                    }
                  >
                    {_pickupMethods?.map((option) => (
                      <RadioGroup.Item
                        key={option.id}
                        value={option.id}
                        disabled={option.insufficient_inventory}
                        data-testid="delivery-option-radio"
                        className={clx(
                          "mb-2 flex cursor-pointer items-center justify-between rounded-rounded border border-ui-border-base py-4 px-8 text-small-regular transition hover:shadow-borders-interactive-with-active data-[state=checked]:border-ui-border-interactive",
                          {
                            "cursor-not-allowed opacity-60 hover:shadow-none":
                              option.insufficient_inventory,
                          }
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-base data-[state=checked]:border-ui-border-interactive">
                            <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </span>
                          <div className="flex flex-col gap-0">
                            <Text className="text-base-regular">
                              {option.name}
                            </Text>
                            <Text className="text-base-regular text-ui-fg-muted">
                              {formatAddress(
                                option.service_zone?.fulfillment_set?.location
                                  ?.address
                              )}
                            </Text>
                          </div>
                        </div>
                        <Text className="text-ui-fg-base">
                          {convertToLocale({
                            amount: option.amount!,
                            currency_code: cart?.currency_code,
                          })}
                        </Text>
                      </RadioGroup.Item>
                    ))}
                  </RadioGroup.Root>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-small-regular">
          {cart && (cart.shipping_methods?.length ?? 0) > 0 ? (
            <div className="flex max-w-md flex-col gap-2">
              <Text className="txt-medium-plus text-ui-fg-base">
                Method
              </Text>
              <Text className="txt-medium text-ui-fg-subtle">
                {cart.shipping_methods?.at(-1)?.name}{" "}
                {convertToLocale({
                  amount: cart.shipping_methods.at(-1)?.amount!,
                  currency_code: cart?.currency_code,
                })}
              </Text>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
