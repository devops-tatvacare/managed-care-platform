import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  size?: "default" | "compact";
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  size = "default",
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h1
          className={cn(
            "font-bold text-text-primary",
            size === "compact" ? "text-lg" : "text-xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-0.5 text-text-muted",
              size === "compact" ? "text-xs" : "text-sm",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
