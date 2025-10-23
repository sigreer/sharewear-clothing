import DynamicCategoryMenuService from "../../service"
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

  it("sorts by name alphabetically when ranks are equal", async () => {
    const { service } = buildService()

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "cat3",
        name: "Zebra",
        handle: "zebra",
        rank: 1,
      }),
      buildCategory({
        id: "cat1",
        name: "Apple",
        handle: "apple",
        rank: 1,
      }),
      buildCategory({
        id: "cat2",
        name: "Mango",
        handle: "mango",
        rank: 1,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree).toHaveLength(3)
    expect(tree[0].label).toBe("Apple")
    expect(tree[1].label).toBe("Mango")
    expect(tree[2].label).toBe("Zebra")
  })

  it("returns null for navigation item when linkSource is falsy", async () => {
    const { service } = buildService({ fallbackToId: false })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_no_link",
        name: "No Link",
        handle: "",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree).toHaveLength(0)
  })

  it("uses transformCategory function when provided", async () => {
    const transformCategory = jest.fn((category) => ({
      customField: "custom-value",
      label: `Custom ${category.name}`,
    }))

    const { service } = buildService({ transformCategory })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_transform",
        name: "Transform",
        handle: "transform",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(transformCategory).toHaveBeenCalledWith(expect.objectContaining({
      id: "pcat_transform",
      name: "Transform",
    }))
    expect(tree[0]).toMatchObject({
      id: "pcat_transform",
      label: "Custom Transform",
      customField: "custom-value",
    })
  })

  it("uses handle for display name when name is missing", async () => {
    const { service } = buildService()

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_handle_only",
        name: "",
        handle: "my-handle",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      label: "my-handle",
    })
  })

  it("returns empty string from resolveLinkSource when no handle and fallbackToId is false", async () => {
    const { service } = buildService({ fallbackToId: false })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_no_fallback",
        name: "No Fallback",
        handle: null,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    // Should be filtered out because linkSource is empty
    expect(tree).toHaveLength(0)
  })

  it("returns category id when resolveDisplayName finds no name or handle", async () => {
    const { service } = buildService({ fallbackToId: true, fallbackPrefix: "" })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_id_only",
        name: null,
        handle: null,
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      label: "pcat_id_only",
    })
  })

  it("handles transformCategory returning null or undefined fields gracefully", async () => {
    const transformCategory = jest.fn(() => null)

    const { service } = buildService({ transformCategory })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "pcat_null_transform",
        name: "Null Transform",
        handle: "null-transform",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    // Should still build the item with base properties
    expect(tree[0]).toMatchObject({
      id: "pcat_null_transform",
      label: "Null Transform",
      href: "/store?category=null-transform",
    })
  })

  it("preserves children when transformCategory modifies other fields", async () => {
    const transformCategory = jest.fn((category) => ({
      customField: "value",
    }))

    const { service } = buildService({ transformCategory })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "parent",
        name: "Parent",
        handle: "parent",
      }),
      buildCategory({
        id: "child",
        name: "Child",
        handle: "child",
        parent_category_id: "parent",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    expect(tree[0]).toMatchObject({
      id: "parent",
      customField: "value",
      children: expect.arrayContaining([
        expect.objectContaining({
          id: "child",
        }),
      ]),
    })
  })

  it("uses transformation children when explicitly provided", async () => {
    const transformCategory = jest.fn((category) => ({
      children: category.id === "parent" ? [] : undefined,
    }))

    const { service } = buildService({ transformCategory })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "parent",
        name: "Parent",
        handle: "parent",
      }),
      buildCategory({
        id: "child",
        name: "Child",
        handle: "child",
        parent_category_id: "parent",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    // Transform function explicitly set children to empty array
    expect(tree[0]).toMatchObject({
      id: "parent",
      children: [],
    })
  })

  it("returns empty string when category has no id and fallbackToId is false", async () => {
    const { service } = buildService({ fallbackToId: false })

    const categories: ProductCategoryDTO[] = [
      buildCategory({
        id: "",
        name: "",
        handle: "",
      }),
    ]

    const tree = await service.buildNavigationTree(categories)

    // Should be filtered out since there's no link source
    expect(tree).toHaveLength(0)
  })
})
