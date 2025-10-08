'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ColorModeToggleProps {
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  merged?: boolean
  mobile?: boolean
}

const ColorModeToggle = ({
  size = 'default',
  variant = 'ghost',
  merged = false,
  mobile = false
}: ColorModeToggleProps) => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const desktopIconSize = size === 'sm' ? 20 : size === 'lg' ? 24 : 22
  const iconSize = mobile ? 28 : desktopIconSize
  const iconStrokeWidth = 1.8

  // Always render the same fallback state until we know the theme
  if (!mounted || !theme) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={400}>
          <TooltipTrigger asChild>
            <Button
              aria-label="Toggle theme"
              variant={variant}
              size="icon"
              className={`
                rounded-lg
                transition-colors
                ${mobile ? 'bg-transparent hover:bg-transparent text-primary-foreground hover:text-primary-foreground/80 h-auto w-auto p-0 flex items-center justify-center' : ''}
                ${!mobile && merged ? 'bg-white text-white hover:bg-secondary hover:text-secondary-foreground' : ''}
                ${!mobile && !merged ? 'bg-white hover:bg-secondary hover:text-secondary-foreground text-foreground-secondary' : ''}
              `}
              data-testid="color-mode-toggle"
              onClick={toggleTheme}
            >
              <Sun size={iconSize} strokeWidth={iconStrokeWidth} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Toggle theme
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <Button
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            variant={variant}
            onClick={toggleTheme}
            className={`rounded-lg transition-colors ${
              mobile
                ? 'bg-transparent hover:bg-transparent text-primary-foreground hover:text-primary-foreground/80 h-auto w-auto p-0 flex items-center justify-center'
                : merged
                  ? 'bg-primary text-primary-foreground hover:bg-white hover:text-primary h-8 w-8 p-0'
                  : 'bg-background text-text hover:bg-primary hover:text-primary-foreground h-8 w-8 p-0'
            }`}
            data-testid="color-mode-toggle"
          >
            {theme === 'light'
              ? <Moon size={iconSize} strokeWidth={iconStrokeWidth} />
              : <Sun size={iconSize} strokeWidth={iconStrokeWidth} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Switch to {theme === 'light' ? 'dark' : 'light'} mode
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ColorModeToggle
