import { clx } from "@medusajs/ui"
import React from "react"
import {
  Dialog,
  DialogContent,
  DialogClose
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import { ModalProvider, useModal } from "@lib/context/modal-context"
import X from "@modules/common/icons/x"

type ModalProps = {
  isOpen: boolean
  close: () => void
  size?: "small" | "medium" | "large"
  search?: boolean
  children: React.ReactNode
  'data-testid'?: string
}

const Modal = ({
  isOpen,
  close,
  size = "medium",
  search = false,
  children,
  'data-testid': dataTestId
}: ModalProps) => {
  const sizeClasses = {
    small: "max-w-sm",
    medium: "max-w-lg",
    large: "max-w-xl"
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        data-testid={dataTestId}
        className={cn(
          "max-h-[75vh] p-5",
          sizeClasses[size],
          search && "bg-transparent shadow-none border-none rounded-none"
        )}
      >
        <ModalProvider close={close}>{children}</ModalProvider>
      </DialogContent>
    </Dialog>
  )
}

const Title: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { close } = useModal()

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-large-semi font-semibold">{children}</h2>
      <DialogClose
        onClick={close}
        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        data-testid="close-modal-button"
      >
        <X size={20} />
        <span className="sr-only">Close</span>
      </DialogClose>
    </div>
  )
}

const Description: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="text-small-regular text-foreground flex items-center justify-center pt-2 pb-4 h-full">
      {children}
    </div>
  )
}

const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex justify-center">
      {children}
    </div>
  )
}

const Footer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex items-center justify-end gap-4">
      {children}
    </div>
  )
}

Modal.Title = Title
Modal.Description = Description
Modal.Body = Body
Modal.Footer = Footer

export default Modal
