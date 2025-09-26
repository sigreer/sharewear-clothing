import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { IProductModuleService, ProductDTO } from "@medusajs/types"

const toNumber = (value: unknown, fallback: number): number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
}

const serializeProduct = (product: ProductDTO) => ({
  id: product.id,
  title: product.title,
  handle: product.handle ?? null,
  description: product.description ?? null,
  thumbnail: product.thumbnail ?? null,
  images: (product.images ?? []).map(image => ({
    id: image.id,
    url: image.url ?? null,
    alt_text: (image.metadata?.alt as string | undefined) ?? null,
    metadata: image.metadata ?? null
  }))
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const search = typeof req.query.q === "string" ? req.query.q.trim() : undefined
  const limit = toNumber(req.query.limit, 20)
  const offset = toNumber(req.query.offset, 0)

  const take = Math.max(limit + offset, 50)

  const products = await productModuleService.listProducts(
    {
      categories: {
        id: categoryId
      }
    },
    {
      select: [
        "id",
        "title",
        "handle",
        "description",
        "thumbnail"
      ],
      relations: ["images"],
      take
    }
  )

  const filtered = products.filter(product => {
    if (!search?.length) {
      return true
    }

    const term = search.toLowerCase()
    return (
      product.title?.toLowerCase().includes(term) ||
      product.handle?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)
    )
  })

  const paginated = filtered.slice(offset, offset + limit)

  res.json({
    products: paginated.map(serializeProduct),
    count: filtered.length,
    limit,
    offset,
    category_id: categoryId
  })
}
