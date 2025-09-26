'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ScrollNavbarState {
  isScrolled: boolean
  isNavbarMerged: boolean
  scrollY: number
  iconOpacity: number
}

export const useScrollNavbar = () => {
  const [state, setState] = useState<ScrollNavbarState>({
    isScrolled: false,
    isNavbarMerged: false,
    scrollY: 0,
    iconOpacity: 1,
  })

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY
    const headerHeight = 64 // 16 * 4 = 64px (h-16)
    const horizontalNavElement = document.getElementById('horizontal-nav')

    let isNavbarMerged = false

    let iconOpacity = 1

    if (horizontalNavElement) {
      const rect = horizontalNavElement.getBoundingClientRect()
      // Merge when the horizontal nav reaches the top of the viewport
      // Adding a small threshold for smoother transition
      isNavbarMerged = rect.top <= 5

      // Calculate icon opacity based on scroll progress
      // Start fading when we're halfway to the merge point
      const fadeStartPoint = headerHeight / 2
      const fadeEndPoint = headerHeight

      if (scrollY >= fadeStartPoint && scrollY < fadeEndPoint) {
        // Fade out from 1 to 0 as we approach the merge point
        const fadeProgress = (scrollY - fadeStartPoint) / (fadeEndPoint - fadeStartPoint)
        iconOpacity = Math.max(0, 1 - fadeProgress)
      } else if (scrollY >= fadeEndPoint) {
        iconOpacity = 0
      }
    } else {
      // Fallback: merge after scrolling past header height
      isNavbarMerged = scrollY > headerHeight
      iconOpacity = scrollY > headerHeight ? 0 : 1
    }

    setState({
      isScrolled: scrollY > 10, // Small threshold to avoid jitter
      isNavbarMerged,
      scrollY,
      iconOpacity,
    })
  }, [])

  useEffect(() => {
    // Initial check
    handleScroll()

    // Add scroll listener with throttling
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [handleScroll])

  return state
}