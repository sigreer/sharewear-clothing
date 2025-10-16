import { RadioGroup, Text } from "@medusajs/ui"
import { useState, useEffect } from "react"

/**
 * Preset position types for T-shirt design placement
 */
export type PresetPosition = 'center-chest' | 'left-chest' | 'full-front' | 'back-center'

/**
 * Preset configuration with metadata
 */
export interface PresetConfig {
  id: PresetPosition
  label: string
  description: string
  recommended: string
}

/**
 * Available preset positions for T-shirt designs
 */
export const PRESETS: PresetConfig[] = [
  {
    id: 'center-chest',
    label: 'Center Chest',
    description: 'Standard centered design on front',
    recommended: 'Most popular for brand logos and graphics',
  },
  {
    id: 'left-chest',
    label: 'Left Chest',
    description: 'Small design on left chest (pocket area)',
    recommended: 'Subtle branding, professional look',
  },
  {
    id: 'full-front',
    label: 'Full Front',
    description: 'Large design covering most of front',
    recommended: 'Bold statements, artistic designs',
  },
  {
    id: 'back-center',
    label: 'Back Center',
    description: 'Centered design on back of shirt',
    recommended: 'Event shirts, team numbers',
  },
]

export interface PresetSelectorProps {
  /** Currently selected preset position */
  selectedPreset?: PresetPosition
  /** Callback when preset is selected */
  onPresetSelect: (preset: PresetPosition) => void
  /** Callback when validation state changes */
  onValidationChange: (isValid: boolean) => void
}

/**
 * Preset Selector Component
 *
 * Allows users to select a predefined design position on T-shirt templates.
 * Features:
 * - Visual preview cards for each preset
 * - Radio button selection
 * - Responsive grid layout (2x2 on desktop, 1 column on mobile)
 * - Default preset selection (center-chest)
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <PresetSelector
 *   selectedPreset="center-chest"
 *   onPresetSelect={(preset) => console.log("Selected:", preset)}
 *   onValidationChange={(isValid) => setCanProceed(isValid)}
 * />
 * ```
 */
export const PresetSelector = ({
  selectedPreset = 'center-chest',
  onPresetSelect,
  onValidationChange,
}: PresetSelectorProps) => {
  const [selected, setSelected] = useState<PresetPosition>(selectedPreset)

  /**
   * Initialize with default preset and mark as valid
   */
  useEffect(() => {
    // Always valid since we have a default selection
    onValidationChange(true)
  }, [onValidationChange])

  /**
   * Handle preset selection
   */
  const handlePresetChange = (value: PresetPosition) => {
    setSelected(value)
    onPresetSelect(value)
    onValidationChange(true)
  }

  /**
   * Handle keyboard navigation on cards
   */
  const handleCardKeyDown = (event: React.KeyboardEvent, preset: PresetPosition) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handlePresetChange(preset)
    }
  }

  /**
   * Render T-shirt diagram SVG for each preset
   */
  const renderTshirtDiagram = (preset: PresetPosition) => {
    const isSelected = selected === preset

    // Base T-shirt outline
    const tshirtPath = "M15 4L12 2L9 4L6 4L4 6L4 20L6 22L18 22L20 20L20 6L18 4L15 4Z"

    // Design position rectangles for each preset
    const designPositions = {
      'center-chest': { x: 8, y: 9, width: 8, height: 6 },
      'left-chest': { x: 8, y: 7, width: 3, height: 3 },
      'full-front': { x: 6, y: 7, width: 12, height: 12 },
      'back-center': { x: 8, y: 9, width: 8, height: 6 },
    }

    const position = designPositions[preset]

    return (
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full"
        aria-hidden="true"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* T-shirt outline */}
        <path
          d={tshirtPath}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSelected ? "text-ui-fg-interactive" : "text-ui-fg-muted"}
        />

        {/* Sleeves */}
        <path
          d="M6 4L4 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={isSelected ? "text-ui-fg-interactive" : "text-ui-fg-muted"}
        />
        <path
          d="M18 4L20 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={isSelected ? "text-ui-fg-interactive" : "text-ui-fg-muted"}
        />

        {/* Design position highlight */}
        <rect
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx="1"
          className={isSelected ? "fill-ui-fg-interactive opacity-30" : "fill-ui-fg-muted opacity-20"}
        />
        <rect
          x={position.x}
          y={position.y}
          width={position.width}
          height={position.height}
          rx="1"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2,2"
          className={isSelected ? "stroke-ui-fg-interactive" : "stroke-ui-fg-muted"}
        />
      </svg>
    )
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="space-y-1">
        <Text className="text-ui-fg-base font-medium">
          Select Design Position
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Choose where you want the design placed on the T-shirt
        </Text>
      </div>

      {/* Radio Group with Cards */}
      <RadioGroup
        value={selected}
        onValueChange={(value) => handlePresetChange(value as PresetPosition)}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          role="radiogroup"
          aria-label="Design position presets"
        >
          {PRESETS.map((preset) => {
            const isSelected = selected === preset.id

            return (
              <div
                key={preset.id}
                className={`
                  relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
                  hover:border-ui-fg-interactive hover:bg-ui-bg-subtle-hover
                  focus-within:outline-none focus-within:ring-2 focus-within:ring-ui-fg-interactive focus-within:ring-offset-2
                  ${isSelected
                    ? 'border-ui-fg-interactive bg-ui-bg-interactive/5'
                    : 'border-ui-border-base'
                  }
                `}
                onClick={() => handlePresetChange(preset.id)}
                onKeyDown={(e) => handleCardKeyDown(e, preset.id)}
                tabIndex={0}
                role="radio"
                aria-checked={isSelected}
                aria-labelledby={`preset-${preset.id}-label`}
                aria-describedby={`preset-${preset.id}-description`}
              >
                <div className="flex flex-col gap-4">
                  {/* T-shirt Diagram */}
                  <div className="flex items-center justify-center h-32 bg-ui-bg-subtle rounded-md">
                    <div className="w-24 h-24">
                      {renderTshirtDiagram(preset.id)}
                    </div>
                  </div>

                  {/* Radio Button and Label */}
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <RadioGroup.Item
                        value={preset.id}
                        id={`preset-${preset.id}`}
                        aria-labelledby={`preset-${preset.id}-label`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`preset-${preset.id}`}
                        id={`preset-${preset.id}-label`}
                        className="text-sm font-medium text-ui-fg-base cursor-pointer"
                      >
                        {preset.label}
                      </label>
                      <Text
                        size="xsmall"
                        className="text-ui-fg-subtle"
                        id={`preset-${preset.id}-description`}
                      >
                        {preset.description}
                      </Text>
                    </div>
                  </div>

                  {/* Recommended Use Case */}
                  <div className="pt-2 border-t border-ui-border-base">
                    <Text size="xsmall" className="text-ui-fg-muted italic">
                      {preset.recommended}
                    </Text>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </RadioGroup>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Selected preset: ${PRESETS.find(p => p.id === selected)?.label}. ${PRESETS.find(p => p.id === selected)?.description}`}
      </div>
    </div>
  )
}
