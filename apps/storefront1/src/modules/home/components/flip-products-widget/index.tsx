import { HttpTypes } from "@medusajs/types"
import { listFlipProducts } from "@lib/data/products"
import { Suspense } from "react"
import FlipProductsClient from "./client"

interface FlipProductsWidgetProps {
  countryCode: string
}

const FlipProductsContent = async ({ countryCode }: FlipProductsWidgetProps) => {
  const products = await listFlipProducts(countryCode)

  if (products.length === 0) {
    return null // Don't render the widget if no flip products
  }

  return <FlipProductsClient products={products} />
}

const FlipProductsWidgetSkeleton = () => (
  <section className="py-12 bg-gradient-to-b from-background to-muted/20">
    <div className="container mx-auto px-4">
      <div className="text-center mb-8">
        <div className="h-8 bg-muted rounded-md w-64 mx-auto mb-2" />
        <div className="h-6 bg-muted rounded-md w-96 mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 justify-items-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-full max-w-[280px] h-[320px] rounded-2xl bg-muted animate-pulse"
          />
        ))}
      </div>
    </div>
  </section>
)

export default function FlipProductsWidget({ countryCode }: FlipProductsWidgetProps) {
  return (
    <Suspense fallback={<FlipProductsWidgetSkeleton />}>
      <FlipProductsContent countryCode={countryCode} />
    </Suspense>
  )
}