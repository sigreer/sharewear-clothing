import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MedusaCTA from "@modules/layout/components/medusa-cta"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="w-full border-t border-ui-border-base">
      <div className="content-container flex w-full flex-col gap-0">
        <div className="flex w-full flex-col gap-10 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus uppercase text-ui-fg-subtle transition-colors hover:text-ui-fg-base"
            >
              Medusa Store
            </LocalizedClientLink>
          </div>
          <div className="grid w-full gap-10 text-small-regular sm:max-w-4xl sm:grid-cols-3">
            {productCategories && productCategories.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="txt-small-plus text-ui-fg-base">
                  Categories
                </span>
                <ul
                  className="flex flex-col gap-2 text-ui-fg-subtle"
                  data-testid="footer-categories"
                >
                  {productCategories.slice(0, 6).map((c) => {
                    if (c.parent_category) {
                      return null
                    }

                    const children =
                      c.category_children?.map((child) => ({
                        name: child.name,
                        handle: child.handle,
                        id: child.id,
                      })) || null

                    return (
                      <li key={c.id} className="flex flex-col gap-2">
                        <LocalizedClientLink
                          className={clx(
                            "hover:text-ui-fg-base",
                            children && "txt-small-plus"
                          )}
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                        {children && (
                          <ul className="ml-3 flex flex-col gap-2 text-ui-fg-subtle">
                            {children.map((child) => (
                              <li key={child.id}>
                                <LocalizedClientLink
                                  className="hover:text-ui-fg-base"
                                  href={`/categories/${child.handle}`}
                                  data-testid="category-link"
                                >
                                  {child.name}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="txt-small-plus text-ui-fg-base">
                  Collections
                </span>
                <ul
                  className="grid gap-2 text-ui-fg-subtle"
                  style={{
                    gridTemplateColumns:
                      (collections.length || 0) > 3 ? "repeat(2, minmax(0, 1fr))" : "1fr",
                  }}
                >
                  {collections.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <span className="txt-small-plus text-ui-fg-base">Medusa</span>
              <ul className="flex flex-col gap-2 text-ui-fg-subtle">
                <li>
                  <a
                    href="https://github.com/medusajs"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://docs.medusajs.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/medusajs/nextjs-starter-medusa"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-ui-fg-base"
                  >
                    Source code
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mb-16 flex w-full flex-col items-start justify-between gap-4 text-ui-fg-muted sm:flex-row sm:items-center">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} Medusa Store. All rights reserved.
          </Text>
          <MedusaCTA />
        </div>
      </div>
    </footer>
  )
}
