"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { Search, Package, ShoppingBag, Loader2 } from "lucide-react"

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SearchResult {
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
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merged?: boolean
}

export function SearchDialog({ open, onOpenChange, merged = false }: SearchDialogProps) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  const params = useParams()
  const countryCode = (params.countryCode as string) || "us"

  const runCommand = React.useCallback((command: () => unknown) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  // Search function with debouncing
  const searchProducts = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const searchParams = new URLSearchParams({
        q: searchQuery,
        countryCode,
        limit: "10", // Limit results for command palette
      })

      const response = await fetch(`/api/search?${searchParams}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.hits || [])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [countryCode])

  // Debounced search effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchProducts])

  // Keyboard shortcut effect
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        e.preventDefault()
        onOpenChange(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [onOpenChange])

  const formatPrice = (price: SearchResult['price']) => {
    if (!price) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: price.currency_code,
    }).format(price.amount / 100)
  }

  return (
    <>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={`rounded-lg transition-colors h-8 w-8 p-0 ${
              merged
                ? 'text-white hover:bg-white hover:text-primary'
                : 'text-foreground-secondary hover:bg-primary hover:text-primary-foreground'
            }`}
            onClick={() => onOpenChange(true)}
            aria-label="Search products"
            data-testid="search-button"
          >
            <Search size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Search products (⌘K)
        </TooltipContent>
      </Tooltip>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput
          placeholder="Search for products..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            ) : (
              "No products found."
            )}
          </CommandEmpty>

          {results.length > 0 && (
            <CommandGroup heading="Products">
              {results.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.title}
                  onSelect={() => {
                    runCommand(() => router.push(`/${countryCode}/products/${product.handle}`))
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                    {product.thumbnail ? (
                      <img
                        src={product.thumbnail}
                        alt={product.title}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {product.title}
                    </p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {product.price && (
                        <Badge variant="secondary" className="text-xs">
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
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => router.push(`/${countryCode}/store`))}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Browse All Products
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push(`/${countryCode}/cart`))}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              View Cart
              <CommandShortcut>⌘C</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
