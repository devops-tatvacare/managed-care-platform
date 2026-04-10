import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

const cardVariants = cva(
  "flex flex-col rounded-[var(--radius-panel)] border text-card-foreground transition-[background-color,border-color,box-shadow]",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-sm",
        subtle:
          "border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-subtle)] shadow-[var(--shadow-surface-quiet)]",
        elevated:
          "border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-raised)] shadow-[var(--shadow-surface-soft)] backdrop-blur-sm",
        ai:
          "border-ai-border bg-[color:var(--color-surface-ai)] shadow-[var(--shadow-surface-soft)]",
        ghost: "border-transparent bg-transparent shadow-none",
      },
      density: {
        default: "gap-6 py-6",
        compact: "gap-4 py-4",
        relaxed: "gap-7 py-7",
        flush: "gap-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      density: "default",
    },
  }
)

function Card({
  className,
  variant,
  density,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-density={density}
      className={cn(cardVariants({ variant, density }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
