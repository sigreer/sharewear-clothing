import { listCategorySelectorEntries } from "@lib/data/category-selector"
import CategoryMenuClient from "./client"

export default async function CategoryMenu({
  countryCode,
}: {
  countryCode: string
}) {
  void countryCode

  const selector = await listCategorySelectorEntries()

  if (!selector || !selector.presentation.enabled) {
    return null
  }

  const categories = selector.categories.filter((category) => {
    if (!category.presentation.enabled) {
      return false
    }

    if (category.issues.length && !category.representation) {
      return false
    }

    switch (category.representation.type) {
      case "custom_image":
        return Boolean(category.representation.custom_image_url)
      case "product_image":
        return Boolean(category.representation.image?.url)
      case "random_pool":
        return category.representation.pool.some((product) => Boolean(product.thumbnail ?? product.images[0]?.url))
      default:
        return false
    }
  })

  if (!categories.length) {
    return null
  }

  return (
    <CategoryMenuClient
      presentation={selector.presentation}
      categories={categories}
    />
  )
}
