import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  CATEGORY_SELECTOR_BY_PRODUCT,
  CategorySelectorByProductService,
  CategorySelectorPresentationConfig
} from "../../../../modules/category-selector-by-product"

type PresentationResponse = {
  presentation: CategorySelectorPresentationConfig
}

const extractPresentation = (body: any) => {
  if (!body || typeof body !== "object") {
    return undefined
  }

  return body.presentation
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )

  const presentation = await selectorService.getGlobalPresentation()

  res.json({
    presentation
  } satisfies PresentationResponse)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const payload = extractPresentation(req.body)

  if (payload !== undefined && typeof payload !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Presentation settings must be provided as an object."
    )
  }

  const selectorService =
    req.scope.resolve<CategorySelectorByProductService>(
      CATEGORY_SELECTOR_BY_PRODUCT
    )

  const presentation = await selectorService.updateGlobalPresentation(payload)

  res.json({
    presentation
  } satisfies PresentationResponse)
}
