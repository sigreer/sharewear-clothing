'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UITest() {
  return (
    <div className="py-8 px-4">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center">
          ShadCN UI Integration
        </h1>

        <p className="text-center text-lg text-muted-foreground">
          Your storefront is now powered by ShadCN UI
        </p>

        <Card className="p-6 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Component Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button size="lg">
                Primary Button
              </Button>
              <Button variant="outline" size="lg">
                Outline Button
              </Button>
              <Button variant="ghost" size="lg">
                Ghost Button
              </Button>
              <Button variant="secondary" size="lg">
                Secondary Button
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Remove this component when ready to build your homepage.
        </p>
      </div>
    </div>
  )
}
