"use client"

import * as React from "react"
import { ArrowRightMini } from "@medusajs/icons"
import { XIcon } from "lucide-react"
import { Menu } from "lucide-react"
import { Text, clx, useToggleState } from "@medusajs/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import { HttpTypes } from "@medusajs/types"

const SideMenuItems = {
  Home: "/",
  Search: "/search",
  Store: "/store",
  Electronics: "/store?category=electronics",
  Fashion: "/store?category=fashion",
  "Home & Garden": "/store?category=home-garden",
  Sports: "/store?category=sports",
  Books: "/store?category=books",
  Account: "/account",
  Cart: "/cart",
}

const SideMenu = ({ regions }: { regions: HttpTypes.StoreRegion[] | null }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const toggleState = useToggleState()
  const SHOW_REGION_SELECTOR = false

  const handleBackdropClick = () => setIsOpen(false)

  return (
    <div className="h-full md:hidden">
      <div className="flex h-full items-center">
        <button
          type="button"
          data-testid="nav-menu-button"
          className="flex items-center justify-center px-0 text-primary-foreground transition-colors duration-200 hover:text-primary-foreground/80"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={28} strokeWidth={1.8} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[1200]" onClick={handleBackdropClick}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 flex h-full w-full">
            <div
              className="relative flex h-full min-h-full flex-col overflow-y-auto border border-border bg-background shadow-2xl"
              style={{ width: "clamp(240px, 65vw, 90vw)" }}
              onClick={(event) => event.stopPropagation()}
              data-testid="nav-menu-popup"
            >
              <button
                type="button"
                aria-label="Close menu"
                data-testid="close-menu-button"
                className="absolute top-3 right-3 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary-foreground"
                onClick={() => setIsOpen(false)}
              >
                <XIcon className="h-6 w-6" />
              </button>

              <div className="flex flex-1 flex-col justify-between gap-6 px-6 pb-6 pt-4">
                <ul className="mt-8 flex flex-col gap-3 pr-12">
                  {Object.entries(SideMenuItems).map(([name, href]) => (
                    <li key={name}>
                      <LocalizedClientLink
                        href={href}
                        onClick={() => setIsOpen(false)}
                        data-testid={`${name.toLowerCase()}-link`}
                        className="block truncate rounded-lg p-2 text-xl font-semibold text-text transition-colors hover:bg-muted hover:text-secondary-hover"
                      >
                        {name}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>

                {SHOW_REGION_SELECTOR && regions && (
                  <div className="flex flex-col gap-6">
                    <div
                      className="flex items-center justify-between"
                      onMouseEnter={toggleState.open}
                      onMouseLeave={toggleState.close}
                    >
                      <CountrySelect
                        toggleState={toggleState}
                        regions={regions}
                      />
                      <ArrowRightMini
                        className={clx(
                          "transition-transform duration-150 text-primary-foreground",
                          toggleState.state ? "-rotate-90" : ""
                        )}
                      />
                    </div>
                    <Text className="txt-compact-small text-primary-foreground">
                      © {new Date().getFullYear()} Sharewear Clothing. All rights
                      reserved.
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SideMenu
