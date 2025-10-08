"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion } from "./regions"

export interface SearchResult {
  id: string
  title: string
  handle: string
  description?: string
  thumbnail?: string
  price?: {
    amount: number
    currency_code: string
  }
  collection?: {
    title: string
  }
  category?: {
    name: string
  }
}

export interface SearchResponse {
  hits: SearchResult[]
  query: string
  processingTimeMs: number
  hitsPerPage: number
  page: number
  totalPages: number
  totalHits: number
}

export const searchProducts = async ({
  query,
  countryCode,
  limit = 20,
  offset = 0,
  filters = {},
}: {
  query: string
  countryCode: string
  limit?: number
  offset?: number
  filters?: Record<string, any>
}): Promise<SearchResponse> => {
  if (!query.trim()) {
    return {
      hits: [],
      query: "",
      processingTimeMs: 0,
      hitsPerPage: limit,
      page: Math.floor(offset / limit) + 1,
      totalPages: 0,
      totalHits: 0,
    }
  }

  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error("Region not found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    // Use Meilisearch API endpoints provided by the plugin
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
      ...filters,
    })

    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://sharewear.local:9000"
    const response = await fetch(
      `${backendUrl}/store/meilisearch/products?${searchParams}`,
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        ...getCacheOptions("search", { revalidate: 60 }) // Cache for 1 minute
      }
    )

    if (!response.ok) {
      throw new Error(`Search API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform the response to match our SearchResponse interface
    const hits: SearchResult[] = data.hits?.map((hit: any) => ({
      id: hit.id,
      title: hit.title,
      handle: hit.handle,
      description: hit.description,
      thumbnail: hit.thumbnail,
      price: hit.variants?.[0]?.calculated_price ? {
        amount: hit.variants[0].calculated_price.amount,
        currency_code: hit.variants[0].calculated_price.currency_code,
      } : undefined,
      collection: hit.collection ? {
        title: hit.collection.title,
      } : undefined,
    })) || []

    return {
      hits,
      query: data.query || query,
      processingTimeMs: data.processingTimeMs || 0,
      hitsPerPage: data.hitsPerPage || limit,
      page: data.page || Math.floor(offset / limit) + 1,
      totalPages: data.totalPages || Math.ceil((data.totalHits || 0) / limit),
      totalHits: data.totalHits || 0,
    }
  } catch (error) {
    console.error("Search error:", error)

    // Fallback to regular product search if Meilisearch is not available
    return fallbackProductSearch({ query, countryCode, limit, offset, region })
  }
}

// Fallback search using regular Medusa product API
const fallbackProductSearch = async ({
  query,
  countryCode,
  limit,
  offset,
  region,
}: {
  query: string
  countryCode: string
  limit: number
  offset: number
  region: HttpTypes.StoreRegion
}): Promise<SearchResponse> => {
  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const searchParams: HttpTypes.FindParams & HttpTypes.StoreProductParams = {
      limit,
      offset,
      q: query,
      region_id: region.id,
      fields: "+variants.calculated_price",
    }

    const { products, count } = await sdk.store.product.list(
      searchParams,
      headers,
      getCacheOptions("products", { revalidate: 300 })
    )

    const hits: SearchResult[] = products.map((product) => ({
      id: product.id!,
      title: product.title!,
      handle: product.handle!,
      description: product.description || undefined,
      thumbnail: product.thumbnail || undefined,
      price: product.variants?.[0]?.calculated_price ? {
        amount: product.variants[0].calculated_price.amount,
        currency_code: product.variants[0].calculated_price.currency_code,
      } : undefined,
      collection: product.collection ? {
        title: product.collection.title,
      } : undefined,
    }))

    return {
      hits,
      query,
      processingTimeMs: 0,
      hitsPerPage: limit,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(count / limit),
      totalHits: count,
    }
  } catch (error) {
    console.error("Fallback search error:", error)

    return {
      hits: [],
      query,
      processingTimeMs: 0,
      hitsPerPage: limit,
      page: Math.floor(offset / limit) + 1,
      totalPages: 0,
      totalHits: 0,
    }
  }
}

export const searchCategories = async ({
  query,
  limit = 10,
  offset = 0,
}: {
  query: string
  limit?: number
  offset?: number
}): Promise<{
  hits: Array<{
    id: string
    name: string
    handle: string
    description?: string
  }>
  totalHits: number
}> => {
  if (!query.trim()) {
    return { hits: [], totalHits: 0 }
  }

  try {
    const headers = {
      ...(await getAuthHeaders()),
    }

    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    })

    const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://sharewear.local:9000"
    const response = await fetch(
      `${backendUrl}/store/meilisearch/categories?${searchParams}`,
      {
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        ...getCacheOptions("search-categories", { revalidate: 300 })
      }
    )

    if (!response.ok) {
      throw new Error(`Category search API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      hits: data.hits || [],
      totalHits: data.totalHits || 0,
    }
  } catch (error) {
    console.error("Category search error:", error)
    return { hits: [], totalHits: 0 }
  }
}