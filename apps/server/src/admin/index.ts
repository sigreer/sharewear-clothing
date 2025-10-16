import MailtrapPage, {
  config as mailtrapConfig
} from "./routes/settings/mailtrap/page"
import CategorySelectorPage, {
  config as categorySelectorConfig
} from "./routes/catalog/category-selector-by-product/page"
import MegaMenuPage, {
  config as megaMenuConfig
} from "./routes/catalog/mega-menu/page"
import RenderWizardPage, {
  config as renderWizardConfig
} from "./routes/products/[id]/render-wizard/page"

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
  },
  {
    path: "/catalog/mega-menu",
    Component: MegaMenuPage,
    config: megaMenuConfig
  },
  {
    path: "/products/:id/render-wizard",
    Component: RenderWizardPage,
    config: renderWizardConfig
  }
] as const
