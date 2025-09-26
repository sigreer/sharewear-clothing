'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type ColorMode = 'light' | 'dark'

export interface ColorModeProviderProps {
  children: React.ReactNode
  defaultValue?: ColorMode
  storageKey?: string
}

interface ColorModeContextType {
  colorMode: ColorMode
  setColorMode: (colorMode: ColorMode) => void
  toggleColorMode: () => void
}

const ColorModeContext = createContext<ColorModeContextType | undefined>(undefined)

export function ColorModeProvider({
  children,
  defaultValue = 'light',
  storageKey = 'storefront-color-mode',
}: ColorModeProviderProps) {
  const [colorMode, setColorModeState] = useState<ColorMode>(defaultValue)

  useEffect(() => {
    // Get initial color mode from localStorage or system preference
    const stored = localStorage.getItem(storageKey) as ColorMode | null
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    const initialMode = stored || systemPreference
    setColorModeState(initialMode)

    // Apply to document
    document.documentElement.dataset.theme = initialMode
    if (initialMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [storageKey])

  const setColorMode = (newColorMode: ColorMode) => {
    setColorModeState(newColorMode)
    localStorage.setItem(storageKey, newColorMode)

    // Apply to document
    document.documentElement.dataset.theme = newColorMode
    if (newColorMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleColorMode = () => {
    setColorMode(colorMode === 'light' ? 'dark' : 'light')
  }

  return (
    <ColorModeContext.Provider
      value={{
        colorMode,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (context === undefined) {
    throw new Error('useColorMode must be used within a ColorModeProvider')
  }
  return context
}

export function useColorModeValue<T>(lightValue: T, darkValue: T): T {
  const { colorMode } = useColorMode()
  return colorMode === 'light' ? lightValue : darkValue
}
