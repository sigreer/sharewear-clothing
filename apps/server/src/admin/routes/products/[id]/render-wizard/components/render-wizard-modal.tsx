import { FocusModal, Button, Heading, Text, ProgressTabs } from "@medusajs/ui"
import { useState, useEffect, useCallback, KeyboardEvent } from "react"
import { UploadStep } from "./upload-step"
import { PresetSelector, PresetPosition } from "./preset-selector"
import { RenderProgress } from "./render-progress"

/**
 * Steps in the render wizard flow
 */
export enum WizardStep {
  UPLOAD_DESIGN = 0,
  SELECT_PRESET = 1,
  PROGRESS_TRACKING = 2,
}

export interface RenderWizardModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when the modal should close */
  onOpenChange: (open: boolean) => void
  /** Product ID for the render job */
  productId: string
  /** Callback when render job is completed */
  onRenderComplete?: () => void
}

/**
 * Render Wizard Modal Component
 *
 * A multi-step wizard for creating product render jobs:
 * 1. Upload Design - Upload design file
 * 2. Select Preset Position - Choose design placement
 * 3. Progress Tracking - Monitor render progress
 *
 * Features:
 * - Multi-step navigation with validation
 * - Keyboard navigation (Tab, Escape, Enter)
 * - Focus trap within modal
 * - WCAG 2.1 AA accessibility compliance
 * - Screen reader announcements
 */
export const RenderWizardModal = ({
  open,
  onOpenChange,
  productId,
  onRenderComplete,
}: RenderWizardModalProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.UPLOAD_DESIGN)
  const [canProceed, setCanProceed] = useState(false)
  const [stepData, setStepData] = useState({
    designFile: null as File | null,
    preset: "center-chest" as PresetPosition,
    jobId: "",
  })

  // Screen reader announcement state
  const [announcement, setAnnouncement] = useState("")

  /**
   * Reset wizard state when modal closes
   */
  useEffect(() => {
    if (!open) {
      setCurrentStep(WizardStep.UPLOAD_DESIGN)
      setCanProceed(false)
      setStepData({
        designFile: null,
        preset: "center-chest",
        jobId: "",
      })
    }
  }, [open])

  /**
   * Announce step changes to screen readers
   */
  useEffect(() => {
    const stepNames = {
      [WizardStep.UPLOAD_DESIGN]: "Upload Design",
      [WizardStep.SELECT_PRESET]: "Select Preset Position",
      [WizardStep.PROGRESS_TRACKING]: "Progress Tracking",
    }

    if (open) {
      setAnnouncement(`Step ${currentStep + 1} of 3: ${stepNames[currentStep]}`)
    }
  }, [currentStep, open])

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // Escape key closes modal
    if (event.key === "Escape") {
      onOpenChange(false)
      event.preventDefault()
      return
    }

    // Enter key proceeds to next step if validation passes
    if (event.key === "Enter" && canProceed && currentStep < WizardStep.PROGRESS_TRACKING) {
      handleNext()
      event.preventDefault()
      return
    }
  }, [canProceed, currentStep, onOpenChange])

  /**
   * Navigate to next step
   */
  const handleNext = useCallback(() => {
    if (canProceed && currentStep < WizardStep.PROGRESS_TRACKING) {
      setCurrentStep((prev) => prev + 1)
      setCanProceed(false) // Reset validation for next step
    }
  }, [canProceed, currentStep])

  /**
   * Navigate to previous step
   */
  const handleBack = useCallback(() => {
    if (currentStep > WizardStep.UPLOAD_DESIGN) {
      setCurrentStep((prev) => prev - 1)
      setCanProceed(true) // Previous steps were already validated
    }
  }, [currentStep])

  /**
   * Close the modal
   */
  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  /**
   * Update step data and validation state
   */
  const updateStepData = useCallback(<K extends keyof typeof stepData>(
    key: K,
    value: typeof stepData[K]
  ) => {
    setStepData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.UPLOAD_DESIGN:
        return (
          <div className="space-y-4" role="group" aria-labelledby="step-upload-heading">
            <Heading id="step-upload-heading" level="h3" className="sr-only">
              Upload Design File
            </Heading>
            <Text className="text-ui-fg-subtle">
              Upload your design file to generate product renders. Supported formats: PNG, JPG (max 10MB)
            </Text>
            <UploadStep
              onFileSelect={(file) => updateStepData("designFile", file)}
              onValidationChange={(isValid) => setCanProceed(isValid)}
            />
          </div>
        )

      case WizardStep.SELECT_PRESET:
        return (
          <div className="space-y-4" role="group" aria-labelledby="step-preset-heading">
            <Heading id="step-preset-heading" level="h3" className="sr-only">
              Select Preset Position
            </Heading>
            <PresetSelector
              selectedPreset={stepData.preset}
              onPresetSelect={(preset) => updateStepData("preset", preset)}
              onValidationChange={(isValid) => setCanProceed(isValid)}
            />
          </div>
        )

      case WizardStep.PROGRESS_TRACKING:
        return (
          <div className="space-y-4" role="group" aria-labelledby="step-progress-heading">
            <Heading id="step-progress-heading" level="h3" className="sr-only">
              Render Progress
            </Heading>
            {stepData.designFile && (
              <RenderProgress
                productId={productId}
                designFile={stepData.designFile}
                preset={stepData.preset}
                onComplete={() => {
                  if (onRenderComplete) {
                    onRenderComplete()
                  }
                }}
                onError={(error) => {
                  console.error("[RenderWizard] Render error:", error)
                }}
              />
            )}
          </div>
        )

      default:
        return null
    }
  }

  /**
   * Render footer buttons based on current step
   */
  const renderFooterButtons = () => {
    return (
      <div className="flex items-center justify-between gap-x-2 w-full">
        <div className="flex gap-x-2">
          {currentStep > WizardStep.UPLOAD_DESIGN && currentStep < WizardStep.PROGRESS_TRACKING && (
            <Button
              variant="secondary"
              onClick={handleBack}
              aria-label="Go to previous step"
            >
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-x-2">
          {currentStep < WizardStep.PROGRESS_TRACKING && (
            <Button
              variant="secondary"
              onClick={handleClose}
              aria-label="Cancel and close wizard"
            >
              Cancel
            </Button>
          )}

          {currentStep < WizardStep.PROGRESS_TRACKING ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed}
              aria-label={currentStep === WizardStep.SELECT_PRESET ? "Start render" : "Proceed to next step"}
            >
              {currentStep === WizardStep.SELECT_PRESET ? "Start Render" : "Next"}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleClose}
              aria-label="Close wizard and return to product"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <FocusModal
        open={open}
        onOpenChange={onOpenChange}
      >
        <FocusModal.Content
          onKeyDown={handleKeyDown}
          aria-labelledby="wizard-title"
          aria-describedby="wizard-description"
        >
          <FocusModal.Header>
            <div className="flex flex-col gap-y-2">
              <Heading id="wizard-title" level="h1" className="text-xl font-semibold">
                Generate Product Renders
              </Heading>
              <Text id="wizard-description" size="small" className="text-ui-fg-subtle">
                Step {currentStep + 1} of 3
              </Text>
            </div>

            {/* Progress indicator */}
            <div className="mt-4">
              <ProgressTabs
                value={String(currentStep)}
                onValueChange={(value) => {
                  // Prevent direct tab navigation - users must use Next/Back buttons
                  // This ensures validation is not bypassed
                }}
              >
                <ProgressTabs.List>
                  <ProgressTabs.Trigger
                    value={String(WizardStep.UPLOAD_DESIGN)}
                    status={
                      currentStep > WizardStep.UPLOAD_DESIGN
                        ? "completed"
                        : currentStep === WizardStep.UPLOAD_DESIGN
                        ? "in-progress"
                        : "not-started"
                    }
                    disabled
                    aria-label="Step 1: Upload Design"
                  >
                    Upload Design
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger
                    value={String(WizardStep.SELECT_PRESET)}
                    status={
                      currentStep > WizardStep.SELECT_PRESET
                        ? "completed"
                        : currentStep === WizardStep.SELECT_PRESET
                        ? "in-progress"
                        : "not-started"
                    }
                    disabled
                    aria-label="Step 2: Select Preset Position"
                  >
                    Select Preset
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger
                    value={String(WizardStep.PROGRESS_TRACKING)}
                    status={
                      currentStep === WizardStep.PROGRESS_TRACKING
                        ? "in-progress"
                        : "not-started"
                    }
                    disabled
                    aria-label="Step 3: Progress Tracking"
                  >
                    Progress
                  </ProgressTabs.Trigger>
                </ProgressTabs.List>
              </ProgressTabs>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex flex-col overflow-y-auto">
            <div className="flex-1 px-6 py-6">
              {renderStepContent()}
            </div>
          </FocusModal.Body>

          <FocusModal.Footer>
            {renderFooterButtons()}
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}
