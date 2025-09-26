import { Metadata } from "next"
import { searchProducts } from "@/lib/data/search"
import { SearchResults } from "@/components/search/search-results"

interface SearchPageProps {
  params: {
    countryCode: string
  }
  searchParams: {
    q?: string
    page?: string
  }
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = searchParams.q || ""

  return {
    title: query ? `Search results for "${query}"` : "Search Products",
    description: query
      ? `Find products matching "${query}" in our ADHD toys collection`
      : "Search our collection of ADHD-friendly toys and products",
  }
}

export default async function SearchPage({
  params: { countryCode },
  searchParams: { q: query, page },
}: SearchPageProps) {
  let initialResults = undefined

  // Perform server-side search if query is provided
  if (query) {
    try {
      const currentPage = parseInt(page || "1")
      const limit = 20
      const offset = (currentPage - 1) * limit

      initialResults = await searchProducts({
        query,
        countryCode,
        limit,
        offset,
      })
    } catch (error) {
      console.error("Server-side search error:", error)
      // Component will handle the search client-side
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {query ? `Search Results` : "Search Products"}
          </h1>
          {query && (
            <p className="text-muted-foreground mt-1">
              Results for "{query}"
            </p>
          )}
        </div>
      </div>

      <SearchResults
        initialResults={initialResults}
        countryCode={countryCode}
      />
    </div>
  )
}