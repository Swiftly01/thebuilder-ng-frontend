import Image from "next/image";
import { useState } from "react";
import PlaceholderImage from "./PlaceholderImage";

/** The surrounding element sets the media slot's dimensions. */
export function ContentImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return <PlaceholderImage text="Image unavailable" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setFailed(src)}
    />
  );
}
