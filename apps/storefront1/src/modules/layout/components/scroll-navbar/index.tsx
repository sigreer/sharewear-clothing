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
  megaMenu?: MegaMenuContent
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
}

const MegaMenuContentTransition = ({ openMegaMenuItem, navigation, onNavigate }: MegaMenuContentTransitionProps) => {
  const [measuredHeight, setMeasuredHeight] = React.useState<number | null>(null)
  const resizeObserverRef = React.useRef<ResizeObserver | null>(null)

  const currentMegaMenuItem = React.useMemo(
    () => navigation.find(item => item.label === openMegaMenuItem && Boolean(item.megaMenu)),
    [navigation, openMegaMenuItem]
  )

  const handlePanelRef = React.useCallback((node: HTMLDivElement | null) => {
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
    <div className="content-container">
      <motion.div
        layout
        className="relative min-h-[220px]"
        style={{ height: measuredHeight ?? 'auto' }}
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
            className="absolute inset-0"
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
  onMegaMenuOpen?: (label: string) => void
  onMegaMenuClose?: () => void
  openMegaMenuItem?: string | null
}

const DesktopNav = ({ items, merged = false, onMegaMenuOpen, onMegaMenuClose, openMegaMenuItem }: DesktopNavProps) => {
  const [openItem, setOpenItem] = React.useState<string | null>(null)
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleOpen = (label: string) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    const navItem = items.find(item => item.label === label)
    if (navItem?.megaMenu && onMegaMenuOpen) {
      // Instantly switch to new mega menu item
      onMegaMenuOpen(label)
    } else {
      setOpenItem(label)
    }
  }

  const handleClose = () => {
    // Add delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setOpenItem(null)
      if (onMegaMenuClose) {
        onMegaMenuClose()
      }
      closeTimeoutRef.current = null
    }, 200) // 200ms delay for smoother transitions
  }

  return (
    <div className="flex flex-row justify-center gap-2 lg:gap-6">
      {items.map((navItem) => {
        const isOpen = openItem === navItem.label || openMegaMenuItem === navItem.label
        const children = navItem.children ?? []
        const hasChildren = children.length > 0
        const hasMegaMenu = Boolean(navItem.megaMenu)

        return (
          <div
            key={navItem.label}
            className="relative"
            onMouseEnter={() => (hasChildren || hasMegaMenu) && handleOpen(navItem.label)}
            onFocusCapture={() => (hasChildren || hasMegaMenu) && handleOpen(navItem.label)}
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

            <AnimatePresence>
              {hasChildren && !hasMegaMenu && isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{
                    duration: 0.15,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className="absolute left-0 top-full flex min-w-[16rem] flex-col gap-2 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-xl"
                >
                  {children.map((child) => (
                    <DesktopSubNav
                      key={child.label}
                      {...child}
                      onSelect={handleClose}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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

export default function ScrollNavbar({ regions, navigationItems, cart }: ScrollNavbarProps) {
  const { isNavbarMerged, iconOpacity } = useScrollNavbar()
  const [openMegaMenuItem, setOpenMegaMenuItem] = React.useState<string | null>(null)
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMegaMenuOpen = (label: string) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    // Instantly switch to new item
    setOpenMegaMenuItem(label)
  }

  const handleMegaMenuClose = () => {
    // Add delay before closing
    closeTimeoutRef.current = setTimeout(() => {
      setOpenMegaMenuItem(null)
      closeTimeoutRef.current = null
    }, 200) // 200ms delay for smoother transitions
  }

  const staticMegaItems = React.useMemo<NavItem[]>(
    () => [
      {
        id: "mega-gadgets",
        label: "gadgets",
        href: "/collections/gadgets",
        megaMenu: {
          layout: 'thumbnail-grid',
          tagline: "Tiny dopamine gadgets that solve everyday ADHD friction points.",
          columns: [
            {
              heading: "Desk Upgrades",
              description: "Keep your command center neat and reactive.",
              items: [
                {
                  label: "Cable Nest",
                  href: "/collections/gadgets/cable-nest",
                  description: "Weighted magnetic keeper for wayward cords.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Focus Dock",
                  href: "/collections/gadgets/focus-dock",
                  description: "Phone stand with timer + low-key fidget slider.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Modular Mat",
                  href: "/collections/gadgets/modular-mat",
                  description: "Snap-together tiles for sorting micro-tasks.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1580894897200-7a379874ab66?auto=format&fit=crop&w=240&q=80"
                }
              ]
            },
            {
              heading: "Portable Helpers",
              description: "Pocket tech for transitions and travel days.",
              items: [
                {
                  label: "Pocket Pom",
                  href: "/collections/gadgets/pocket-pom",
                  description: "Mini Pomodoro puck with gentle buzz alerts.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Task Tiles",
                  href: "/collections/gadgets/task-tiles",
                  description: "Magnetic tokens to plan on the fly.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1559060013-24752e2b2dbc?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Quiet Clicker",
                  href: "/collections/gadgets/quiet-clicker",
                  description: "Discreet sensory gadget for meetings.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=240&q=80"
                }
              ]
            },
            {
              heading: "Reset Stations",
              description: "Micro-kits that help you bounce back fast.",
              items: [
                {
                  label: "Glide Kit",
                  href: "/collections/gadgets/glide-kit",
                  description: "Cooling roller + grounding scent combo.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Snack Sync",
                  href: "/collections/gadgets/snack-sync",
                  description: "Timer jar that reminds you to refuel.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=240&q=80"
                },
                {
                  label: "Recharge Tray",
                  href: "/collections/gadgets/recharge-tray",
                  description: "Weighted catch-all with wireless charging.",
                  thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-bf2e231f49d4?auto=format&fit=crop&w=240&q=80"
                }
              ]
            }
          ]
        }
      },
      {
        id: "mega-gift-lab",
        label: "gift lab",
        href: "/collections/gift-lab",
        megaMenu: {
          tagline: "Curated play ideas for every kind of thinker.",
          columns: [
            {
              heading: "Fidget & Focus",
              description: "Tools to channel restless energy and boost concentration",
              imageUrl: "https://images.unsplash.com/photo-1606103836293-63d36b108706?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Fidget Spinners",
                  href: "/collections/fidget-spinners",
                  description: "Classic spinning satisfaction",
                  icon: "🌀"
                },
                {
                  label: "Stress Balls",
                  href: "/collections/stress-balls",
                  description: "Squeeze away tension",
                  icon: "🎾"
                },
                {
                  label: "Focus Timers",
                  href: "/collections/focus-timers",
                  description: "Pomodoro and visual timers",
                  badge: "Popular"
                }
              ]
            },
            {
              heading: "Sensory Play",
              description: "Tactile experiences for sensory seekers and avoiders",
              imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Kinetic Sand",
                  href: "/collections/kinetic-sand",
                  description: "Moldable, mess-free fun",
                  icon: "🏖️"
                },
                {
                  label: "Textured Toys",
                  href: "/collections/textured-toys",
                  description: "Bumpy, smooth, and squishy",
                  icon: "🔶"
                },
                {
                  label: "Weighted Items",
                  href: "/collections/weighted-items",
                  description: "Calming pressure therapy"
                }
              ]
            },
            {
              heading: "Creative Kits",
              description: "Hands-on projects for hyperfocus sessions",
              imageUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Building Sets",
                  href: "/collections/building-sets",
                  description: "LEGO, magnetic tiles, and more",
                  icon: "🧱"
                },
                {
                  label: "Art Supplies",
                  href: "/collections/art-supplies",
                  description: "Draw, paint, sculpt your way",
                  icon: "🎨"
                },
                {
                  label: "Puzzle Games",
                  href: "/collections/puzzle-games",
                  description: "Brain teasers and logic challenges",
                  badge: "New"
                }
              ]
            },
            {
              heading: "Movement & Energy",
              description: "Active toys for bodies that need to wiggle",
              imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Bounce Seats",
                  href: "/collections/bounce-seats",
                  description: "Wobble while you work",
                  icon: "🪑"
                },
                {
                  label: "Balance Boards",
                  href: "/collections/balance-boards",
                  description: "Standing desk companions",
                  icon: "⚖️"
                },
                {
                  label: "Desk Bikes",
                  href: "/collections/desk-bikes",
                  description: "Pedal your way to focus"
                }
              ]
            },
            {
              heading: "Organization",
              description: "Systems and tools to tame the chaos",
              imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Storage Solutions",
                  href: "/collections/storage-solutions",
                  description: "Cubbies, bins, and dividers",
                  icon: "📦"
                },
                {
                  label: "Label Makers",
                  href: "/collections/label-makers",
                  description: "Everything needs a place",
                  icon: "🏷️"
                },
                {
                  label: "Planners & Journals",
                  href: "/collections/planners-journals",
                  description: "Brain dump and organize thoughts",
                  badge: "Popular"
                }
              ]
            }
          ],
          // featured: [
          //   {
          //     eyebrow: "Spotlight",
          //     label: "Build-Your-Own Dopamine Drawer",
          //     href: "/stories/dopamine-drawer",
          //     description: "Stackable trays, color coding tips, and free printable dividers.",
          //     ctaLabel: "Read the guide",
          //     imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80"
          //   },
          //   {
          //     eyebrow: "Bundle",
          //     label: "Calm Down Capsule",
          //     href: "/products/calm-down-capsule",
          //     description: "A therapist-designed trio for sensory spills and meltdowns.",
          //     ctaLabel: "Shop the kit",
          //     imageUrl: "https://images.unsplash.com/photo-1526401485004-46910ecc8e51?auto=format&fit=crop&w=800&q=80"
          //   }
          // ]
        }
      },
      {
        id: "mega-studio",
        label: "studio",
        href: "/studio",
        megaMenu: {
          tagline: "Thinky workshops, community rituals, and printable planners.",
          columns: [
            {
              heading: "Live Sessions",
              description: "Real-time community support and body doubling",
              imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Body Double Co-Working",
                  href: "/studio/body-double",
                  description: "Live pomodoro room with quiet chat",
                  icon: "👯"
                },
                {
                  label: "Focus Fridays",
                  href: "/studio/focus-fridays",
                  description: "End-of-week deep work sessions",
                  icon: "📅"
                }
              ]
            },
            {
              heading: "Workshops",
              description: "Skill-building sessions for executive function",
              imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Task Triage Clinic",
                  href: "/studio/task-triage",
                  description: "Turn chaos into clear action plans",
                  icon: "🗂️"
                },
                {
                  label: "Reward Loop Design",
                  href: "/studio/workshops/reward-loop",
                  description: "Build sustainable motivation systems",
                  badge: "Popular"
                }
              ]
            },
            {
              heading: "Resources",
              description: "Downloadable tools and templates",
              imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Printable Sketchnotes",
                  href: "/studio/resources/sketchnotes",
                  description: "Visual executive function cheat-sheets",
                  icon: "🖍️"
                },
                {
                  label: "Energy Mapping Kit",
                  href: "/studio/resources/energy-map",
                  description: "Track your natural rhythms"
                }
              ]
            },
            {
              heading: "Community",
              description: "Stories, wins, and shared wisdom",
              imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Behind the Builds",
                  href: "/studio/stories/behind-the-builds",
                  description: "Makers share their creative process",
                  badge: "New"
                },
                {
                  label: "Win Wednesday",
                  href: "/studio/stories/wins",
                  description: "Celebrate progress, big and small"
                }
              ]
            },
            {
              heading: "Archives",
              description: "Past sessions and evergreen content",
              imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=400&q=80",
              items: [
                {
                  label: "Workshop Replays",
                  href: "/studio/archives/workshops",
                  description: "Catch up on missed sessions"
                },
                {
                  label: "Community Playlist",
                  href: "/studio/resources/playlist",
                  description: "Crowdsourced focus music"
                }
              ]
            }
          ],
        }
      }
    ],
    []
  )

  const combinedNavigation = React.useMemo(() => {
    const seen = new Set(navigationItems.map((item) => item.id))
    const merged = staticMegaItems.filter((item) => !seen.has(item.id))
    return [...merged, ...navigationItems]
  }, [navigationItems, staticMegaItems])


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
                adhd.toys
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
                adhd.toys
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
            className="relative z-50 hidden bg-primary md:block"
            onMouseLeave={handleMegaMenuClose}
          >
          <div className="content-container">
            <div className="flex h-16 items-center">
              <div className="flex flex-1 justify-center">
                <DesktopNav
                  items={combinedNavigation}
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
                  navigation={combinedNavigation}
                  onNavigate={handleMegaMenuClose}
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
                    adhd.toys
                  </LocalizedClientLink>
                </motion.div>

                {/* Navigation items - absolute centered */}
                <div className="pointer-events-auto absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <DesktopNav
                    items={combinedNavigation}
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
                      navigation={combinedNavigation}
                      onNavigate={handleMegaMenuClose}
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
