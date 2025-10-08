import { Modules, upperCaseFirst, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { json2csv } from "json-2-csv"

// Helper function to convert JSON to CSV
function convertJsonToCsv(data: any, options?: { sortHeader?: (a: string, b: string) => number }) {
  return json2csv(data, {
    prependHeader: true,
    sortHeader: options?.sortHeader ?? false,
    arrayIndexesAsKeys: true,
    expandNestedObjects: true,
    expandArrayObjects: true,
    unwindArrays: false,
    preventCsvInjection: true,
    emptyFieldValue: "",
  })
}

// Helper function to beautify keys
function beautifyKey(key: string): string {
  return key.split("_").map(upperCaseFirst).join(" ")
}

// Helper function to prefix fields
function prefixFields(obj: any, prefix: string) {
  const res: Record<string, any> = {}
  Object.keys(obj).forEach((key) => {
    res[beautifyKey(`${prefix}_${key}`)] = obj[key]
  })
  return res
}

// Normalize variant for export
function normalizeVariantForExport(variant: any, regionsMap: Map<string, any>, product: any) {
  const flattenedPrices = variant.price_set?.prices
    ?.sort((a: any, b: any) => b.currency_code.localeCompare(a.currency_code))
    .reduce((acc: any, price: any) => {
      const regionRule = price.price_rules?.find((r: any) => r.attribute === "region_id")
      if (regionRule) {
        const region = regionsMap.get(regionRule?.value)
        if (!region) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Region with id ${regionRule?.value} not found`
          )
        }
        const regionKey = `variant_price_${region.name
          .toLowerCase()
          .split(" ")
          .join("_")}_[${region.currency_code.toUpperCase()}]`
        acc[beautifyKey(regionKey)] = price.amount
      } else if (!price.price_rules?.length) {
        acc[beautifyKey(`variant_price_${price.currency_code.toUpperCase()}`)] = price.amount
      }
      return acc
    }, {})

  const options = product.options ?? []
  const flattenedOptions = variant.options?.reduce((acc: any, option: any, idx: number) => {
    const prodOptions = options.find((prodOption: any) => prodOption.id === option.option_id)
    acc[beautifyKey(`variant_option_${idx + 1}_name`)] = prodOptions?.title
    acc[beautifyKey(`variant_option_${idx + 1}_value`)] = option.value
    return acc
  }, {})

  const res = {
    ...prefixFields(variant, "variant"),
    ...flattenedPrices,
    ...flattenedOptions,
  }
  delete res["Variant Price Set"]
  delete res["Variant Options"]
  return res
}

// Normalize product for export
function normalizeProductForExport(product: any) {
  const flattenedImages = product.images?.reduce((acc: any, image: any, idx: number) => {
    acc[beautifyKey(`product_image_${idx + 1}`)] = image.url
    return acc
  }, {})

  const flattenedTags = product.tags?.reduce((acc: any, tag: any, idx: number) => {
    acc[beautifyKey(`product_tag_${idx + 1}`)] = tag.value
    return acc
  }, {})

  const flattenedSalesChannels = product.sales_channels?.reduce(
    (acc: any, salesChannel: any, idx: number) => {
      acc[beautifyKey(`product_sales_channel_${idx + 1}`)] = salesChannel.id
      return acc
    },
    {}
  )

  const flattenedCategories = product.categories?.reduce(
    (acc: any, category: any, idx: number) => {
      acc[beautifyKey(`product_category_${idx + 1}`)] = category.id
      return acc
    },
    {}
  )

  const res = {
    ...prefixFields(product, "product"),
    ...flattenedImages,
    ...flattenedTags,
    ...flattenedSalesChannels,
    ...flattenedCategories,
  }
  delete res["Product Images"]
  delete res["Product Tags"]
  delete res["Product Sales Channels"]
  delete res["Product Categories"]
  delete res["Product Metadata"]
  delete res["Product Type"]
  delete res["Product Collection"]
  delete res["Product Options"]
  return res
}

// Normalize data for export
function normalizeForExport(product: any, { regions }: { regions: any[] }) {
  const regionsMap = new Map(regions.map((r) => [r.id, r]))
  const res = product.reduce((acc: any, product: any) => {
    const variants = product.variants ?? []
    if (!variants.length) {
      acc.push(normalizeProductForExport(product))
      return acc
    }
    variants.forEach((v: any) => {
      const toPush = {
        ...normalizeProductForExport(product),
        ...normalizeVariantForExport(v, regionsMap, product),
      }
      delete toPush["Product Variants"]
      acc.push(toPush)
    })
    return acc
  }, [])
  return res
}

const prodColumnPositions = new Map([
  ["Product Id", 0],
  ["Product Handle", 1],
  ["Product Title", 2],
  ["Product Subtitle", 3],
  ["Product Description", 4],
  ["Product Status", 5],
  ["Product Thumbnail", 6],
  ["Product Weight", 7],
  ["Product Length", 8],
  ["Product Width", 9],
  ["Product Height", 10],
  ["Product HS Code", 11],
  ["Product Origin Country", 12],
  ["Product MID Code", 13],
  ["Product Material", 14],
  ["Product Collection Id", 15],
  ["Product Type Id", 16],
  ["Product Discountable", 17],
  ["Product External Id", 18],
])

const variantColumnPositions = new Map([
  ["Variant Id", 0],
  ["Variant Title", 1],
  ["Variant Sku", 3],
  ["Variant Upc", 4],
  ["Variant Ean", 5],
  ["Variant Hs Code", 6],
  ["Variant Mid Code", 7],
  ["Variant Manage Inventory", 8],
  ["Variant Allow Backorder", 9],
])

const comparator = (a: string, b: string, columnMap: Map<string, number>) => {
  if (columnMap.has(a) && columnMap.has(b)) {
    return columnMap.get(a)! - columnMap.get(b)!
  }
  if (columnMap.has(a)) {
    return -1
  }
  if (columnMap.has(b)) {
    return 1
  }
  return a.localeCompare(b)
}

const csvSortFunction = (a: string, b: string) => {
  if (a.startsWith("Product") && b.startsWith("Product")) {
    return comparator(a, b, prodColumnPositions)
  }
  if (a.startsWith("Variant") && b.startsWith("Variant")) {
    return comparator(a, b, variantColumnPositions)
  }
  return a.localeCompare(b)
}

export const generateProductCsvStepId = "generate-product-csv"

/**
 * This step generates a CSV file that exports products. The CSV
 * file is created and stored using the registered File Module Provider.
 *
 * **FIX**: This custom implementation sets `access: "public"` to prevent
 * duplicate timestamp prefixes in the filename that cause 404 errors.
 *
 * @example
 * const { data: products } = useQueryGraphStep({
 *   entity: "product",
 *   fields: ["*", "variants.*", "collection.*", "categories.*"]
 * })
 *
 * const data = generateProductCsvStep(products)
 */
export const generateProductCsvStep = createStep(
  generateProductCsvStepId,
  async (products: any, { container }) => {
    const regionService = container.resolve(Modules.REGION)
    const regions = await regionService.listRegions(
      {},
      { select: ["id", "name", "currency_code"] }
    )

    const normalizedData = normalizeForExport(products, { regions })
    const csvContent = convertJsonToCsv(normalizedData, {
      sortHeader: csvSortFunction,
    })

    const fileModule = container.resolve(Modules.FILE)
    // Don't add timestamp to filename - the file module will add it automatically
    const filename = "product-exports.csv"

    // FIX: Set access to "public" to prevent "private-" prefix
    // The file module will automatically add a timestamp prefix to the filename
    const file = await fileModule.createFiles({
      filename,
      mimeType: "text/csv",
      content: csvContent,
      access: "public", // This prevents the "private-" prefix (results in "{timestamp}-product-exports.csv")
    })

    return new StepResponse({ id: file.id, filename }, file.id)
  },
  async (fileId, { container }) => {
    if (!fileId) {
      return
    }

    const fileModule = container.resolve(Modules.FILE)
    await fileModule.deleteFiles(fileId)
  }
)
