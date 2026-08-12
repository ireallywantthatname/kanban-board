import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      default: "",
      outline: "",
      secondary: "",
      ghost: "shadow-none bg-transparent",
      destructive: "",
      link: "shadow-none bg-transparent underline",
    },
    size: {
      default: "",
      xs: "min-w-0 min-h-0 h-5 px-2",
      sm: "min-w-0 min-h-0 h-6 px-2",
      lg: "min-h-[23px] px-4",
      icon: "min-w-0 min-h-0 size-6 p-0",
      "icon-xs": "min-w-0 min-h-0 size-5 p-0",
      "icon-sm": "min-w-0 min-h-0 size-6 p-0",
      "icon-lg": "min-w-0 min-h-0 size-7 p-0",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
