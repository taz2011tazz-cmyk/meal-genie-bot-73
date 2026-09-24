import { cn } from "@/lib/utils";

export function MealMateLogo({ className, imageClassName }: { className?: string; imageClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/favicon.png"
        alt="MealMate"
        width={40}
        height={40}
        decoding="async"
        fetchPriority="high"
        className={cn("size-10 object-contain", imageClassName)}
      />
      <span className="font-display text-2xl leading-none">MealMate</span>
    </span>
  );
}
