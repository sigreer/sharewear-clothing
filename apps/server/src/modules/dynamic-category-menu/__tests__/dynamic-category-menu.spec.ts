import DynamicCategoryMenuService from "../service"
import { ProductCategoryDTO } from "@medusajs/types"

const buildCategory = (
  overrides: Partial<ProductCategoryDTO>
): ProductCategoryDTO => {
  const now = new Date()

  return {
    id: "pcat_test",
    name: "Category",
    description: "",
    handle: "category",
    is_active: true,
    is_internal: false,
    rank: 0,
    metadata: undefined,
    parent_category: null,
    parent_category_id: null,
    category_children: [],
    products: [],
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
    ...overrides,
  } as ProductCategoryDTO
}

const buildService = (options = {}) => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  return {
    service: new DynamicCategoryMenuService({ logger: logger as any }, options),
    logger,
  }
}

describe("DynamicCategoryMenuService", () => {
  it("builds a nested navigation tree from active categories", async () => {
    const { service } = buildService()

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "root",
        name: "Root",
        description: "Root description",
        handle: "root",
        parent_category_id: null,
        rank: 1,
      }),
      buildCategory({
        id: "child",
        name: "Child",
        handle: "child",
        parent_category_id: "root",
        rank: 2,
      }),
      buildCategory({
        id: "inactive",
        name: "Inactive",
        handle: "inactive",
        is_active: false,
      }),
      buildCategory({
        id: "internal",
        name: "Internal",
        handle: "internal",
        is_internal: true,
      }),
      buildCategory({
        id: "implicit-active",
        name: "Implicit Active",
        handle: "implicit-active",
        is_active: undefined,
        rank: 3,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree).toHaveLength(2)
    expect(tree[0]).toMatchObject({
      id: "root",
      label: "Root",
      subLabel: "Root description",
      href: "/store?category=root",
      children: [
        {
          id: "child",
          label: "Child",
          href: "/store?category=child",
          children: [],
        },
      ],
    })

    expect(tree[1]).toMatchObject({
      id: "implicit-active",
      label: "Implicit Active",
      href: "/store?category=implicit-active",
    })
  })

  it("falls back to category id when no handle is available", async () => {
    const { service } = buildService({ fallbackToId: true })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_123",
        name: "No Handle",
        handle: "",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      href: `/store?category=${encodeURIComponent("pcat_123")}`,
    })
  })

  it("limits depth when maxDepth is provided", async () => {
    const { service } = buildService({ maxDepth: 1 })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "root",
        name: "Root",
      }),
      buildCategory({
        id: "child",
        name: "Child",
        parent_category_id: "root",
      }),
      buildCategory({
        id: "grandchild",
        name: "Grandchild",
        parent_category_id: "child",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0].children).toEqual([])
  })

  it("falls back to id for label and href when metadata is missing", async () => {
    const { service } = buildService({ fallbackToId: true })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_missing",
        name: undefined,
        handle: undefined,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      label: "pcat_missing",
      href: `/store?category=${encodeURIComponent("pcat_missing")}`,
    })
  })

  it("uses fallback prefix when provided and no name/handle", async () => {
    const { service } = buildService({ fallbackToId: true, fallbackPrefix: "Browse" })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_xyz",
        name: undefined,
        handle: undefined,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      label: "Browse pcat_xyz",
      href: `/store?category=${encodeURIComponent("pcat_xyz")}`,
    })
  })
})
