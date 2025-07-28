"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface FloatingActionPanelContextValue {
  mode: "actions" | "note" | "selection" | null
  setMode: (mode: "actions" | "note" | "selection" | null) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const FloatingActionPanelContext = React.createContext<FloatingActionPanelContextValue>({
  mode: null,
  setMode: () => {},
  open: false,
  setOpen: () => {},
})

export interface FloatingActionPanelRootProps {
  children: (context: FloatingActionPanelContextValue) => React.ReactNode
  defaultMode?: "actions" | "note" | "selection"
}

export function FloatingActionPanelRoot({ children, defaultMode }: FloatingActionPanelRootProps) {
  const [mode, setMode] = React.useState<"actions" | "note" | "selection" | null>(defaultMode || null)
  const [open, setOpen] = React.useState(true)

  const value = React.useMemo(
    () => ({ mode, setMode, open, setOpen }),
    [mode, open]
  )

  return (
    <FloatingActionPanelContext.Provider value={value}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {children(value)}
      </PopoverPrimitive.Root>
    </FloatingActionPanelContext.Provider>
  )
}

export interface FloatingActionPanelTriggerProps {
  children: React.ReactNode
  mode: "actions" | "note" | "selection"
  title?: string
  className?: string
}

export const FloatingActionPanelTrigger = React.forwardRef<
  HTMLButtonElement,
  FloatingActionPanelTriggerProps
>(({ children, mode, title, className }, ref) => {
  const { setMode, setOpen } = React.useContext(FloatingActionPanelContext)

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      onClick={() => {
        setMode(mode)
        setOpen(true)
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 dark:focus-visible:ring-zinc-300",
        className
      )}
      title={title}
    >
      {children}
    </PopoverPrimitive.Trigger>
  )
})
FloatingActionPanelTrigger.displayName = "FloatingActionPanelTrigger"

export interface FloatingActionPanelContentProps {
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
  sideOffset?: number
}

export const FloatingActionPanelContent = React.forwardRef<
  HTMLDivElement,
  FloatingActionPanelContentProps
>(({ children, className, align = "center", sideOffset = 4, ...props }, ref) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-auto rounded-md border shadow-md outline-none bg-transparent data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
FloatingActionPanelContent.displayName = "FloatingActionPanelContent"

export interface FloatingActionPanelButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  icon?: React.ReactNode
}

export const FloatingActionPanelButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionPanelButtonProps
>(({ children, onClick, className, icon }, ref) => {
  const { setOpen } = React.useContext(FloatingActionPanelContext)

  return (
    <button
      ref={ref}
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none",
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
})
FloatingActionPanelButton.displayName = "FloatingActionPanelButton"

export interface FloatingActionPanelFormProps {
  children: React.ReactNode
  onSubmit: (data: string) => void
  className?: string
}

export function FloatingActionPanelForm({ children, onSubmit, className }: FloatingActionPanelFormProps) {
  const { setOpen } = React.useContext(FloatingActionPanelContext)
  const [value, setValue] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim()) {
      onSubmit(value)
      setValue("")
      setOpen(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === FloatingActionPanelTextarea) {
          return React.cloneElement(child, { value, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value) } as any)
        }
        return child
      })}
    </form>
  )
}

export interface FloatingActionPanelTextareaProps {
  className?: string
  placeholder?: string
  id?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export const FloatingActionPanelTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FloatingActionPanelTextareaProps
>(({ className, placeholder = "Add a note...", ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      placeholder={placeholder}
      className={cn(
        "min-h-[80px] w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
FloatingActionPanelTextarea.displayName = "FloatingActionPanelTextarea"

export interface FloatingActionPanelToolbarProps {
  children: React.ReactNode
  className?: string
}

export function FloatingActionPanelToolbar({ children, className }: FloatingActionPanelToolbarProps) {
  return (
    <div className={cn("flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1", className)}>
      {children}
    </div>
  )
}

export interface FloatingActionPanelCheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export const FloatingActionPanelCheckbox = React.forwardRef<
  HTMLButtonElement,
  FloatingActionPanelCheckboxProps
>(({ id, checked = false, onCheckedChange, className }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      value="on"
      id={id}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm !border-transparent shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 bg-transparent data-[state=checked]:bg-transparent data-[state=checked]:text-zinc-900",
        className
      )}
    >
      <span 
        data-state={checked ? "checked" : "unchecked"}
        className="flex items-center justify-center text-current"
        style={{ pointerEvents: "none" }}
      >
        {checked && <Check className="h-1.5 w-1.5" />}
      </span>
    </button>
  )
})
FloatingActionPanelCheckbox.displayName = "FloatingActionPanelCheckbox"

export interface FloatingActionPanelOptionProps {
  children: React.ReactNode
  className?: string
}

export function FloatingActionPanelOption({ children, className }: FloatingActionPanelOptionProps) {
  return (
    <div className={cn("flex items-center space-x-3 p-3 bg-transparent", className)}>
      {children}
    </div>
  )
}

export interface FloatingActionPanelModelOptionProps {
  id: string
  name: string
  description?: string
  quality?: number
  speed?: number
  price?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function FloatingActionPanelModelOption({
  id,
  name,
  description,
  quality,
  speed,
  price,
  checked = false,
  onCheckedChange,
}: FloatingActionPanelModelOptionProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-transparent">
      <div>
        <label 
          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium cursor-pointer" 
          htmlFor={id}
          style={{ marginLeft: '5px' }}
        >
          {name}
        </label>
      </div>
      <FloatingActionPanelCheckbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}