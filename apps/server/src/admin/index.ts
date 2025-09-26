import MailtrapPage, {
  config as mailtrapConfig
} from "./routes/settings/mailtrap/page"
import CategorySelectorPage, {
  config as categorySelectorConfig
} from "./routes/catalog/category-selector-by-product/page"

// eslint-disable-next-line import/no-default-export
export default [
  {
    path: "/settings/mailtrap",
    Component: MailtrapPage,
    config: mailtrapConfig
  },
  {
    path: "/catalog/category-nav-images",
    Component: CategorySelectorPage,
    config: categorySelectorConfig
  }
] as const
