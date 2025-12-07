import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroupContext = React.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
} | null>(null);

const RadioGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (value: string) => void }
>(({ className, value, onValueChange, ...props }, ref) => {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange }}>
            <div
                role="radiogroup"
                className={cn("grid gap-2", className)}
                ref={ref}
                {...props}
            />
        </RadioGroupContext.Provider>
    )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value: itemValue, ...props }, ref) => { // Renamed value to itemValue to avoid conflict
    const context = React.useContext(RadioGroupContext);
    const isChecked = context?.value === itemValue;

    return (
        <button
            ref={ref}
            role="radio"
            aria-checked={isChecked}
            type="button"
            onClick={() => context?.onValueChange?.(itemValue)}
            className={cn(
                "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            <span className={cn("flex items-center justify-center", isChecked ? "opacity-100" : "opacity-0")}>
                <Circle className="h-2.5 w-2.5 fill-current text-current" />
            </span>
        </button>
    )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
