"use client"

import { Text } from "@medusajs/ui"
import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"
import { HttpTypes } from "@medusajs/types"
import Accordion from "./accordion"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const tabs = [
    {
      label: "Product Information",
      component: <ProductInfoTab product={product} />,
    },
    {
      label: "Shipping & Returns",
      component: <ShippingInfoTab />,
    },
  ]

  return (
    <div className="w-full">
      <Accordion type="multiple">
        {tabs.map((tab) => (
          <Accordion.Item key={tab.label} value={tab.label} title={tab.label}>
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  )
}

const ProductInfoTab = ({ product }: ProductTabsProps) => {
  return (
    <div className="text-small-regular py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <Text className="font-semibold">Material</Text>
            <Text>{product.material ? product.material : "-"}</Text>
          </div>
          <div>
            <Text className="font-semibold">Country of origin</Text>
            <Text>{product.origin_country ? product.origin_country : "-"}</Text>
          </div>
          <div>
            <Text className="font-semibold">Type</Text>
            <Text>{product.type ? product.type.value : "-"}</Text>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <Text className="font-semibold">Weight</Text>
            <Text>{product.weight ? `${product.weight} g` : "-"}</Text>
          </div>
          <div>
            <Text className="font-semibold">Dimensions</Text>
            <Text>
              {product.length && product.width && product.height
                ? `${product.length}L x ${product.width}W x ${product.height}H`
                : "-"}
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

const ShippingInfoTab = () => {
  return (
    <div className="text-small-regular py-8">
      <div className="flex flex-col gap-8">
        <div className="flex items-start gap-2">
          <FastDelivery />
          <div className="max-w-sm space-y-1">
            <Text className="font-semibold">Fast delivery</Text>
            <Text>
              Your package will arrive in 3-5 business days at your pick up
              location or in the comfort of your home.
            </Text>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Refresh />
          <div className="max-w-sm space-y-1">
            <Text className="font-semibold">Simple exchanges</Text>
            <Text>
              Is the fit not quite right? No worries - we&apos;ll exchange your
              product for a new one.
            </Text>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Back />
          <div className="max-w-sm space-y-1">
            <Text className="font-semibold">Easy returns</Text>
            <Text>
              Just return your product and we&apos;ll refund your money. No
              questions asked – we&apos;ll do our best to make sure your return
              is hassle-free.
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductTabs
