"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex w-full items-center justify-between gap-3", className)}
      data-slot="pagination"
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 items-center justify-between gap-3", className)}
      data-slot="pagination-content"
      {...props}
    />
  )
}

type PaginationButtonProps = React.ComponentProps<typeof Button> & {
  direction: "previous" | "next"
}

function PaginationButton({
  children,
  className,
  direction,
  ...props
}: PaginationButtonProps) {
  const icon =
    direction === "previous" ? (
      <ChevronLeft className="size-3.5" />
    ) : (
      <ChevronRight className="size-3.5" />
    )

  return (
    <Button
      className={cn("min-w-20", className)}
      size="sm"
      variant="outline"
      {...props}
    >
      {direction === "previous" ? icon : null}
      {children}
      {direction === "next" ? icon : null}
    </Button>
  )
}

function PaginationInfo({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      data-slot="pagination-info"
      {...props}
    />
  )
}

export { Pagination, PaginationButton, PaginationContent, PaginationInfo }
