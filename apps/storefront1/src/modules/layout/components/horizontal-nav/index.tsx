'use client'

import * as React from 'react'
import { Transition } from '@headlessui/react'
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export interface NavItem {
  id: string
  label: string
  subLabel?: string
  children?: Array<NavItem>
  href?: string
}

const DesktopNav = ({ items }: { items: NavItem[] }) => {
  const [openItem, setOpenItem] = React.useState<string | null>(null)

  const handleOpen = (label: string) => setOpenItem(label)
  const handleClose = () => setOpenItem(null)

  return (
    <div className="flex flex-row gap-8">
      {items.map((navItem) => {
        const isOpen = openItem === navItem.label
        const children = navItem.children ?? []
        const hasChildren = children.length > 0

        return (
          <div
            key={navItem.label}
            className="relative"
            onMouseEnter={() => hasChildren && handleOpen(navItem.label)}
            onMouseLeave={handleClose}
            onFocusCapture={() => hasChildren && handleOpen(navItem.label)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                handleClose()
              }
            }}
          >
            <LocalizedClientLink
              href={navItem.href ?? '#'}
              className="block px-3 py-2 text-md lowercase font-medium text-white transition-colors hover:text-red-100 focus:outline-none focus-visible:text-red-100"
              onClick={handleClose}
            >
              {navItem.label}
            </LocalizedClientLink>

            <Transition
              show={hasChildren && isOpen}
              as={React.Fragment}
              enter="transition ease-out duration-150"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-2"
            >
              <div className="absolute left-0 top-full flex min-w-[16rem] flex-col gap-2 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-xl">
                {children.map((child) => (
                  <DesktopSubNav
                    key={child.label}
                    {...child}
                    onSelect={handleClose}
                  />
                ))}
              </div>
            </Transition>
          </div>
        )
      })}
    </div>
  )
}

const DesktopSubNav = ({ label, href, subLabel, onSelect }: NavItem & { onSelect?: () => void }) => {
  return (
    <LocalizedClientLink
      href={href ?? '#'}
      className="group rounded-md p-2 transition-colors hover:bg-muted/60"
      onClick={onSelect}
    >
      <div className="flex flex-col">
        <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
          {label}
        </span>
        {subLabel && (
          <span className="text-sm text-muted-foreground">{subLabel}</span>
        )}
      </div>
    </LocalizedClientLink>
  )
}

interface HorizontalNavProps {
  items: NavItem[]
}

export default function HorizontalNav({ items }: HorizontalNavProps) {
  if (!items?.length) {
    return null
  }

  return (
    <div className="relative z-50 hidden border-t border-b border-red-600 bg-red-500 md:block">
      <div className="mx-auto flex max-w-6xl justify-center px-4 py-2 md:px-6 lg:px-8">
        <DesktopNav items={items} />
      </div>
    </div>
  )
}
