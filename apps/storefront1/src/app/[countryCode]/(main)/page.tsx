import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import FlipProductsWidget from "@modules/home/components/flip-products-widget"
import CategoryMenu from "@modules/home/components/category-menu"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "ADHD Toys - Ecommerce Platform",
  description:
    "ADHD Toys ecommerce platform built with Medusa v2 and Next.js 15.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <CategoryMenu countryCode={countryCode} />
      <FlipProductsWidget countryCode={countryCode} />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
