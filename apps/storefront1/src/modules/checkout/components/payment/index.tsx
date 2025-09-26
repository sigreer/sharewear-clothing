"use client"

import { isStripe as isStripeFunc, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const isStripe = isStripeFunc(selectedPaymentMethod)

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeFunc(method)) {
      await initiatePaymentSession(cart, {
        provider_id: method,
      })
    }
  }

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputCard =
        isStripeFunc(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })
      }

      if (!shouldInputCard) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          }
        )
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
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
                !isOpen && !paymentReady,
            }
          )}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive transition-colors hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      <div>
        {isOpen ? (
          <div className="flex flex-col gap-6">
            {!paidByGiftcard && availablePaymentMethods?.length ? (
              <RadioGroup
                value={selectedPaymentMethod ?? ""}
                onChange={(method: string) => {
                  void setPaymentMethod(method)
                }}
              >
                <div className="flex flex-col gap-4">
                  {availablePaymentMethods.map((paymentMethod) => (
                    <div key={paymentMethod.id}>
                      {isStripeFunc(paymentMethod.id) ? (
                        <StripeCardContainer
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          paymentInfoMap={paymentInfoMap}
                          setCardBrand={setCardBrand}
                          setError={setError}
                          setCardComplete={setCardComplete}
                        />
                      ) : (
                        <PaymentContainer
                          paymentInfoMap={paymentInfoMap}
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : null}

            {paidByGiftcard && (
              <div className="w-full max-w-sm space-y-1">
                <Text className="txt-medium-plus text-ui-fg-base">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  Gift card
                </Text>
              </div>
            )}

            <ErrorMessage
              error={error}
              data-testid="payment-method-error-message"
            />

            <Button
              size="large"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={
                (isStripe && !cardComplete) ||
                (!selectedPaymentMethod && !paidByGiftcard)
              }
              data-testid="submit-payment-button"
            >
              {!activeSession && isStripeFunc(selectedPaymentMethod)
                ? " Enter card details"
                : "Continue to review"}
            </Button>
          </div>
        ) : (
          <div>
            {cart && paymentReady && activeSession ? (
              <div className="flex w-full flex-wrap gap-6 text-small-regular sm:flex-nowrap">
                <div className="flex w-full max-w-xs flex-col gap-1">
                  <Text className="txt-medium-plus text-ui-fg-base">
                    Payment method
                  </Text>
                  <Text
                    className="txt-medium text-ui-fg-subtle"
                    data-testid="payment-method-summary"
                  >
                    {paymentInfoMap[activeSession?.provider_id]?.title ||
                      activeSession?.provider_id}
                  </Text>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-1">
                  <Text className="txt-medium-plus text-ui-fg-base">
                    Payment details
                  </Text>
                  <div
                    className="flex items-center gap-2 txt-medium text-ui-fg-subtle"
                    data-testid="payment-details-summary"
                  >
                    <Container className="flex h-7 w-fit items-center bg-ui-button-neutral-hover p-2">
                      {paymentInfoMap[selectedPaymentMethod]?.icon || (
                        <CreditCard />
                      )}
                    </Container>
                    <Text>
                      {isStripeFunc(selectedPaymentMethod) && cardBrand
                        ? cardBrand
                        : "Another step will appear"}
                    </Text>
                  </div>
                </div>
              </div>
            ) : paidByGiftcard ? (
              <div className="w-full max-w-sm space-y-1">
                <Text className="txt-medium-plus text-ui-fg-base">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  Gift card
                </Text>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment
