"use client"

import { HttpTypes } from "@medusajs/types"
import CardFlip from "@/components/kokonutui/card-flip"

interface ProductCardProps {
  product: HttpTypes.StoreProduct
}

interface FlipProductsClientProps {
  products: HttpTypes.StoreProduct[]
}

const ProductCard = ({ product }: ProductCardProps) => {
  // Extract features from categories and tags
  const features = [
    ...(product.categories?.map(cat => cat.name) || []),
    ...(product.tags?.map(tag => tag.value) || []),
    product.collection?.title || "Featured"
  ].filter(Boolean).slice(0, 4) // Limit to 4 features

  // Create a short description from the product description
  const shortDescription = product.description
    ? product.description.length > 100
      ? `${product.description.substring(0, 100)}...`
      : product.description
    : "Discover our amazing product"

  // Extract front and back images based on metadata indices
  const frontImageIndex = typeof product.metadata?.flipFront === 'number' ? product.metadata.flipFront : 0
  const backImageIndex = typeof product.metadata?.flipBack === 'number' ? product.metadata.flipBack : 1

  // Get image URLs by index
  const frontImage = product.images?.[frontImageIndex]?.url
  const backImage = product.images?.[backImageIndex]?.url

  return (
    <CardFlip
      title={product.title}
      subtitle={product.subtitle || shortDescription}
      description={product.description || shortDescription}
      features={features}
      frontImage={frontImage}
      backImage={backImage}
    />
  )
}

export default function FlipProductsClient({ products }: FlipProductsClientProps) {
  return (
    <section className="py-12 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Featured Products</h2>
          <p className="text-muted-foreground text-lg">
            Hover over the cards to discover more about our featured items
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}