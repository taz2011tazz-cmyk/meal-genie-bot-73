import { useEffect, useState } from "react";
import {
  categoryFallbackUrl,
  curatedRecipeImageUrl,
  recipeImageUrl,
  IMAGE_DIMENSIONS,
  type ImageRecipeLike,
  type ImageSize,
} from "@/lib/recipe-image";

/**
 * Renders a recipe photo that is always a real image.
 *
 * Curated recipes render their audited photo straight away. Everything else
 * renders a real category photo immediately and upgrades to the dish-specific
 * generated photo only once that photo has actually loaded (with a timeout),
 * so a slow or failing image service never leaves a blank tile.
 */
export function RecipeImage({
  recipe,
  size = "card",
  className,
  priority = false,
  alt,
}: {
  recipe: ImageRecipeLike;
  size?: ImageSize;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const curated = curatedRecipeImageUrl(recipe, size);
  const remote = recipeImageUrl(recipe, size);
  const fallback = categoryFallbackUrl(recipe);
  const [src, setSrc] = useState(curated ?? fallback);

  useEffect(() => {
    if (curated) {
      setSrc(curated);
      return;
    }
    setSrc(fallback);
    if (!remote || remote === fallback) return;
    let cancelled = false;
    const probe = new Image();
    const timer = window.setTimeout(() => {
      cancelled = true;
    }, 12000);
    probe.onload = () => {
      if (!cancelled) setSrc(remote);
      window.clearTimeout(timer);
    };
    probe.onerror = () => window.clearTimeout(timer);
    probe.src = remote;
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      probe.onload = null;
      probe.onerror = null;
    };
  }, [curated, remote, fallback]);

  return (
    <img
      src={src}
      alt={alt ?? recipe.name}
      width={IMAGE_DIMENSIONS[size].width}
      height={IMAGE_DIMENSIONS[size].height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setSrc(fallback)}
      className={className}
    />
  );
}
