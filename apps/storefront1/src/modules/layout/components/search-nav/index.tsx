"use client"

import * as React from "react"
import { SearchDialog } from "@/components/search/search-dialog"

interface SearchNavProps {
  merged?: boolean
}

export function SearchNav({ merged = false }: SearchNavProps) {
  const [open, setOpen] = React.useState(false)

  return <SearchDialog open={open} onOpenChange={setOpen} merged={merged} />
}