"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Loader2, Filter, SortAsc } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchResult, SearchResponse } from "@/lib/data/search"

interface SearchResultsProps {
  initialResults?: SearchResponse
  countryCode: string
}

export function SearchResults({ initialResults, countryCode }: SearchResultsProps) {
  const [results, setResults] = React.useState<SearchResponse | undefined>(initialResults)
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState("relevance")
  const [page, setPage] = React.useState(1)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize query from URL params
  React.useEffect(() => {
    const urlQuery = searchParams.get("q")
    if (urlQuery) {
      setQuery(urlQuery)
    }
  }, [searchParams])

  const performSearch = React.useCallback(async (searchQuery: string, pageNum = 1) => {
    if (!searchQuery.trim()) {
      setResults(undefined)
      return
    }

    setLoading(true)
    try {
      const searchParams = new URLSearchParams({
        q: searchQuery,
        countryCode,
        limit: "20",
        offset: ((pageNum - 1) * 20).toString(),
      })

      if (sortBy !== "relevance") {
        searchParams.set("sort", sortBy)
      }

      const response = await fetch(`/api/search?${searchParams}`)
      if (response.ok) {
        const data: SearchResponse = await response.json()
        setResults(data)
        setPage(pageNum)

        // Update URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set("q", searchQuery)
        if (pageNum > 1) {
          newUrl.searchParams.set("page", pageNum.toString())
        } else {
          newUrl.searchParams.delete("page")
        }
        window.history.replaceState({}, "", newUrl.toString())
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults(undefined)
    } finally {
      setLoading(false)
    }
  }, [countryCode, sortBy])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        performSearch(query, 1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleProductClick = (product: SearchResult) => {
    router.push(`/${countryCode}/products/${product.handle}`)
  }

  const handlePageChange = (newPage: number) => {
    if (query) {
      performSearch(query, newPage)
    }
  }

  const formatPrice = (price: SearchResult['price']) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency_code,
    }).format(price.amount / 100)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SortAsc className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="title_asc">Name: A to Z</SelectItem>
                <SelectItem value="title_desc">Name: Z to A</SelectItem>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Summary */}
        {results && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {results.totalHits > 0 ? (
                <>
                  Showing {((results.page - 1) * results.hitsPerPage) + 1} to{" "}
                  {Math.min(results.page * results.hitsPerPage, results.totalHits)} of{" "}
                  {results.totalHits} results for "<span className="font-medium">{results.query}</span>"
                </>
              ) : (
                <>No results found for "<span className="font-medium">{results.query}</span>"</>
              )}
            </p>
            {results.processingTimeMs > 0 && (
              <Badge variant="outline" className="text-xs">
                {results.processingTimeMs}ms
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Searching...</span>
        </div>
      )}

      {/* Results Grid */}
      {results && results.hits.length > 0 && !loading && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.hits.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="group cursor-pointer rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="aspect-square mb-4 overflow-hidden rounded-md bg-muted">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Search className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium leading-tight group-hover:text-primary line-clamp-2">
                    {product.title}
                  </h3>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    {product.price && (
                      <Badge variant="secondary">
                        {formatPrice(product.price)}
                      </Badge>
                    )}

                    {product.collection && (
                      <Badge variant="outline" className="text-xs">
                        {product.collection.title}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, results.totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                    >
                      {pageNum}
                    </Button>
                  )
                })}

                {results.totalPages > 5 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(results.totalPages)}
                      disabled={loading}
                    >
                      {results.totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= results.totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* No Results */}
      {results && results.hits.length === 0 && !loading && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or browse our categories.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push(`/${countryCode}/store`)}
          >
            Browse All Products
          </Button>
        </div>
      )}
    </div>
  )
}