'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleUser, ShoppingBasket } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartDropdown from "@modules/layout/components/cart-dropdown"
import SideMenu from "@modules/layout/components/side-menu"
import ColorModeToggle from "@modules/layout/components/color-mode-toggle"
import { SearchNav } from "@modules/layout/components/search-nav"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useScrollNavbar } from "@modules/layout/hooks/use-scroll-navbar"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import MegaMenuPanel, { MegaMenuContent } from "@modules/layout/components/mega-menu"

export interface NavItem {
  id: string
  label: string
  subLabel?: string
  children?: Array<NavItem>
  href?: string
  description?: string
  megaMenu?: MegaMenuContent | null
}

interface ScrollNavbarProps {
  regions: StoreRegion[]
  navigationItems: NavItem[]
  cart?: HttpTypes.StoreCart | null
}

interface MegaMenuContentTransitionProps {
  openMegaMenuItem: string | null
  navigation: NavItem[]
  onNavigate: () => void
  menuItemRef: HTMLDivElement | null
  containerRef: HTMLDivElement | null
}

const MegaMenuContentTransition = ({ openMegaMenuItem, navigation, onNavigate, menuItemRef, containerRef }: MegaMenuContentTransitionProps) => {
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null)
  const [menuPosition, setMenuPosition] = React.useState<{ left: number; maxWidth: number } | null>(null)
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null)
  const panelRef = React.useRef<HTMLDivElement | null>(null)

  const currentMegaMenuItem = React.useMemo(
    () => navigation.find(item => item.label === openMegaMenuItem && Boolean(item.megaMenu)),
    [navigation, openMegaMenuItem]
  )

  // Calculate position when menu item or panel changes
  React.useEffect(() => {
    if (!menuItemRef || !containerRef || !panelRef.current) {
      setMenuPosition(null)
      return
    }

    const calculatePosition = () => {
      const containerRect = containerRef.getBoundingClientRect()
      const menuItemRect = menuItemRef.getBoundingClientRect()
      const panelWidth = panelRef.current?.offsetWidth || 0

      // Position relative to container
      const menuItemLeft = menuItemRect.left - containerRect.left
      const menuItemCenter = menuItemLeft + (menuItemRect.width / 2)

      // Calculate desired left position (centered under menu item)
      let left = menuItemCenter - (panelWidth / 2)

      // Ensure menu doesn't overflow left
      const minLeft = 24 // 24px padding from left edge
      if (left < minLeft) {
        left = minLeft
      }

      // Ensure menu doesn't overflow right
      const maxLeft = containerRect.width - panelWidth - 24 // 24px padding from right edge
      if (left > maxLeft) {
        left = Math.max(minLeft, maxLeft)
      }

      setMenuPosition({
        left,
        maxWidth: containerRect.width - 48 // 24px padding on each side
      })
    }

    // Calculate immediately
    calculatePosition()

    // Recalculate on resize
    window.addEventListener('resize', calculatePosition)
    return () => window.removeEventListener('resize', calculatePosition)
  }, [menuItemRef, containerRef, openMegaMenuItem])

  const handlePanelRef = React.useCallback((node: HTMLDivElement | null) => {
    panelRef.current = node

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
      resizeObserverRef.current = null
    }

    if (!node) {
      return
    }

    setMeasuredHeight(node.offsetHeight)

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      const observer = new ResizeObserver(entries => {
        const entry = entries[0]
        if (!entry) {
          return
        }
        const nextHeight = Math.round(entry.contentRect.height)
        setMeasuredHeight(prev => (prev === nextHeight ? prev : nextHeight))
      })

      observer.observe(node)
      resizeObserverRef.current = observer
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [])

  if (!currentMegaMenuItem?.megaMenu) {
    return null
  }

  return (
    <div className="content-container relative">
      <motion.div
        layout
        className="relative min-h-[220px] w-auto"
        style={{
          height: measuredHeight ?? 'auto',
          left: menuPosition?.left ?? 0,
          maxWidth: menuPosition?.maxWidth ?? '100%'
        }}
        transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={openMegaMenuItem}
            ref={handlePanelRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="absolute left-0 top-0"
          >
            <MegaMenuPanel content={currentMegaMenuItem.megaMenu} onNavigate={onNavigate} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const CartButtonFallback = ({ merged = false }: { merged?: boolean }) => (
  <Tooltip delayDuration={400}>
    <TooltipTrigger asChild>
      <Button
        asChild
        variant="ghost"
        className={merged
          ? "rounded-lg text-white transition-colors hover:bg-white hover:text-primary h-8 w-8 p-0"
          : "rounded-lg text-foreground-secondary transition-colors hover:bg-primary hover:text-primary-foreground h-8 w-8 p-0"
        }
        aria-label="Cart with 0 items"
        data-testid="nav-cart-link"
      >
        <LocalizedClientLink href="/cart">
          <ShoppingBasket size={22} strokeWidth={1.8} />
        </LocalizedClientLink>
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      Cart
    </TooltipContent>
  </Tooltip>
)

const AccountLink = ({ merged = false, mobile = false }: { merged?: boolean, mobile?: boolean }) => {
  const iconSize = mobile ? 28 : 22
  const strokeWidth = 1.8

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          className={
            mobile
              ? "rounded-lg bg-transparent transition-colors hover:bg-transparent text-primary-foreground hover:text-primary-foreground/80 h-auto w-auto p-0 flex items-center justify-center"
              : merged
              ? "rounded-lg text-white transition-colors hover:bg-white hover:text-primary h-8 w-8 p-0"
              : "rounded-lg text-foreground-secondary transition-colors hover:bg-primary hover:text-primary-foreground h-8 w-8 p-0"
          }
          aria-label="Go to account"
          data-testid="nav-account-link"
        >
          <LocalizedClientLink href="/account" className={mobile ? "flex items-center justify-center" : ""}>
            <CircleUser size={iconSize} strokeWidth={strokeWidth} />
          </LocalizedClientLink>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Account
      </TooltipContent>
    </Tooltip>
  )
}

const UtilityIconCluster = ({
  cart,
  merged,
  mobile = false
}: {
  cart?: HttpTypes.StoreCart | null
  merged: boolean
  mobile?: boolean
}) => (
  <>
    <SearchNav merged={merged} />
    <CartDropdown cart={cart} merged={merged} mobile={mobile} />
    <AccountLink merged={merged} mobile={mobile} />
    <ColorModeToggle size="sm" merged={merged} mobile={mobile} />
  </>
)

interface DesktopNavProps {
  items: NavItem[]
  merged?: boolean
  onMegaMenuOpen?: (label: string, ref: HTMLDivElement) => void
  onMegaMenuClose?: () => void
  openMegaMenuItem?: string | null
}

const DesktopNav = ({ items, merged = false, onMegaMenuOpen, onMegaMenuClose, openMegaMenuItem }: DesktopNavProps) => {
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  const handleOpen = (label: string) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    const navItem = items.find(item => item.label === label)
    if (navItem?.megaMenu && onMegaMenuOpen) {
      const ref = itemRefs.current.get(label)
      if (ref) {
        // Instantly switch to new mega menu item
        onMegaMenuOpen(label, ref)
      }
    }
  }

  const handleClose = () => {
    // Add delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      if (onMegaMenuClose) {
        onMegaMenuClose()
      }
      closeTimeoutRef.current = null
    }, 200) // 200ms delay for smoother transitions
  }

  return (
    <div className="flex flex-row justify-center gap-2 lg:gap-6">
      {items.map((navItem) => {
        const hasMegaMenu = Boolean(navItem.megaMenu)

        return (
          <div
            key={navItem.label}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(navItem.label, el)
              } else {
                itemRefs.current.delete(navItem.label)
              }
            }}
            className="relative"
            onMouseEnter={() => hasMegaMenu && handleOpen(navItem.label)}
            onFocusCapture={() => hasMegaMenu && handleOpen(navItem.label)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null
              if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
                handleClose()
              }
            }}
          >
            <LocalizedClientLink
              href={navItem.href ?? '#'}
              className="flex h-16 items-center px-2 text-base lg:px-3 lg:text-lg lowercase font-medium text-white transition-colors hover:text-red-100 focus:outline-none focus-visible:text-red-100"
              onClick={handleClose}
            >
              {navItem.label}
            </LocalizedClientLink>
          </div>
        )
      })}
    </div>
  )
}


export default function ScrollNavbar({ regions, navigationItems, cart }: ScrollNavbarProps) {
  const { isNavbarMerged, iconOpacity } = useScrollNavbar()
  const [openMegaMenuItem, setOpenMegaMenuItem] = React.useState<string | null>(null)
  const [menuItemRef, setMenuItemRef] = React.useState<HTMLDivElement | null>(null)
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const mergedContainerRef = React.useRef<HTMLDivElement | null>(null)

  const handleMegaMenuOpen = (label: string, ref: HTMLDivElement) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    // Instantly switch to new item
    setOpenMegaMenuItem(label)
    setMenuItemRef(ref)
  }

  const handleMegaMenuClose = () => {
    // Add delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMegaMenuItem(null)
      setMenuItemRef(null)
      closeTimeoutRef.current = null
    }, 200) // 200ms delay for smoother transitions
  }




  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative w-full">
        {/* Mobile Fixed Navbar - always visible on small screens */}
        <header className="fixed top-0 left-0 right-0 z-50 md:hidden h-16 bg-primary text-primary-foreground shadow-lg">
          <nav className="content-container flex h-full w-full items-center justify-between">
            {/* Left side - SideMenu */}
            <div className="flex h-full items-center">
              <SideMenu regions={regions} />
            </div>

            {/* Center - Logo */}
            <div className="flex h-full items-center">
              <LocalizedClientLink
                href="/"
                className="text-2xl font-semibold text-primary-foreground transition-colors hover:text-red-100"
                data-testid="nav-store-link"
              >
                sharewear.clothing
              </LocalizedClientLink>
            </div>

            {/* Right side - Icons */}
            <div className="flex h-full items-center gap-3 sm:gap-4">
              <CartDropdown cart={cart} merged={false} mobile={true} />
              <AccountLink merged={false} mobile={true} />
              <ColorModeToggle size="sm" merged={false} mobile={true} />
            </div>
          </nav>
        </header>

        {/* Desktop Header - background fades but icons remain */}
        <div className="relative hidden md:block">
          {/* Header background */}
          <header
            className={`relative mx-auto h-16 bg-background transition-opacity duration-300 ${
              isNavbarMerged ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <nav className="content-container relative flex h-full w-full items-center text-sm text-gray-600 dark:text-gray-300">
              {/* Left side - SideMenu */}
              <div className="flex h-full items-center">
                <SideMenu regions={regions} />
              </div>

              {/* Center - Logo */}
              <LocalizedClientLink
                href="/"
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-3xl font-semibold hover:text-gray-900 dark:hover:text-white"
                data-testid="nav-store-link"
              >
                sharewear.clothing
              </LocalizedClientLink>
            </nav>
          </header>

          {/* Stationary icons - fade out during scroll, slide in when merged */}
          {!isNavbarMerged && (
            <div
              className="absolute top-0 left-0 right-0 h-16 flex items-center z-[70] pointer-events-none transition-opacity duration-200"
              style={{ opacity: iconOpacity }}
            >
              <div className="content-container">
                <div className="flex h-full w-full items-center justify-end">
                  <div className="flex h-full items-center gap-2 lg:gap-4 pointer-events-auto">
                    <UtilityIconCluster cart={cart} merged={false} />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Original Horizontal Nav - transforms when scrolled */}
        {!isNavbarMerged && (
          <div
            id="horizontal-nav"
            ref={containerRef}
            className="relative z-50 hidden bg-primary md:block"
            onMouseLeave={handleMegaMenuClose}
          >
          <div className="content-container">
            <div className="flex h-16 items-center">
              <div className="flex flex-1 justify-center">
                <DesktopNav
                  items={navigationItems}
                  onMegaMenuOpen={handleMegaMenuOpen}
                  onMegaMenuClose={handleMegaMenuClose}
                  openMegaMenuItem={openMegaMenuItem}
                />
              </div>
            </div>
          </div>

          {/* Mega Menu positioned relative to horizontal nav */}
          <AnimatePresence mode="popLayout">
            {openMegaMenuItem && (
              <motion.div
                key="mega-menu-container"
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{
                  duration: 0.25,
                  ease: [0.16, 1, 0.3, 1],
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.25 },
                  y: { duration: 0.25 }
                }}
                className="absolute left-0 right-0 top-full z-[70]"
                onMouseEnter={() => {
                  // Cancel any pending close when entering mega-menu
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current)
                    closeTimeoutRef.current = null
                  }
                }}
              >
                <MegaMenuContentTransition
                  openMegaMenuItem={openMegaMenuItem}
                  navigation={navigationItems}
                  onNavigate={handleMegaMenuClose}
                  menuItemRef={menuItemRef}
                  containerRef={containerRef.current}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Fixed Merged Navbar - appears when scrolled */}
        <AnimatePresence>
          {isNavbarMerged && (
            <motion.div
              key="merged-horizontal-nav"
              ref={mergedContainerRef}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.33, 1, 0.68, 1] }}
              className="fixed top-0 left-0 right-0 z-[60] bg-primary backdrop-blur-sm shadow-lg h-[45px] hidden md:block"
              onMouseLeave={handleMegaMenuClose}
            >
              <div className="content-container relative flex h-[45px] items-center">
                {/* Logo fades out to the left when horizontal nav returns */}
                <motion.div
                  initial={false}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -200, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className="flex items-center"
                >
                  <LocalizedClientLink
                    href="/"
                    className="text-2xl font-semibold text-white hover:text-red-100 transition-colors"
                    data-testid="nav-store-link"
                  >
                    sharewear.clothing
                  </LocalizedClientLink>
                </motion.div>

                {/* Navigation items - absolute centered */}
                <div className="pointer-events-auto absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <DesktopNav
                    items={navigationItems}
                    merged={true}
                    onMegaMenuOpen={handleMegaMenuOpen}
                    onMegaMenuClose={handleMegaMenuClose}
                    openMegaMenuItem={openMegaMenuItem}
                  />
                </div>

                {/* Right side - icon cluster */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{
                    duration: 0.375,
                    ease: [0.33, 1, 0.68, 1]
                  }}
                  className="ml-auto flex h-full items-center gap-2 lg:gap-4 pointer-events-auto"
                >
                  <UtilityIconCluster cart={cart} merged={true} />
                </motion.div>
              </div>

              {/* Mega Menu for merged navbar */}
              <AnimatePresence mode="popLayout">
                {openMegaMenuItem && (
                  <motion.div
                    key="mega-menu-container-merged"
                    initial={{ opacity: 0, y: -12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                      opacity: { duration: 0.2 },
                      scale: { duration: 0.25 },
                      y: { duration: 0.25 }
                    }}
                    className="absolute left-0 right-0 top-full z-[70]"
                    onMouseEnter={() => {
                      if (closeTimeoutRef.current) {
                        clearTimeout(closeTimeoutRef.current)
                        closeTimeoutRef.current = null
                      }
                    }}
                  >
                    <MegaMenuContentTransition
                      openMegaMenuItem={openMegaMenuItem}
                      navigation={navigationItems}
                      onNavigate={handleMegaMenuClose}
                      menuItemRef={menuItemRef}
                      containerRef={mergedContainerRef.current}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  )
}
