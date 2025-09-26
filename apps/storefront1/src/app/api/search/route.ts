import { NextRequest, NextResponse } from "next/server"
import { searchProducts } from "@/lib/data/search"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const countryCode = searchParams.get("countryCode") || "us"
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    if (!query) {
      return NextResponse.json({
        hits: [],
        query: "",
        processingTimeMs: 0,
        hitsPerPage: limit,
        page: 1,
        totalPages: 0,
        totalHits: 0,
      })
    }

    const results = await searchProducts({
      query,
      countryCode,
      limit,
      offset,
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search API error:", error)

    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}