import Image from "next/image";
import { helicopterColor, helicopterInitials } from "@/lib/helicopter-identity";

type HelicopterBadgeProps = {
  registration: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

const SIZE_PX: Record<NonNullable<HelicopterBadgeProps["size"]>, number> = { sm: 24, md: 32, lg: 56 };
const SIZE_TEXT: Record<NonNullable<HelicopterBadgeProps["size"]>, string> = { sm: "text-[9px]", md: "text-[11px]", lg: "text-base" };

/** The one place every page renders "which aircraft is this" as a small
 * visual chip — a colored ring (see lib/helicopter-identity.ts) around
 * either the aircraft's uploaded photo, or its tail-number initials when no
 * photo has been uploaded yet. Reused on Flota, Boletines, and the
 * maintenance report so the same aircraft always looks the same everywhere. */
export function HelicopterBadge({ registration, photoUrl, size = "md", showLabel = true, className }: HelicopterBadgeProps) {
  const color = helicopterColor(registration);
  const px = SIZE_PX[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-full"
        style={{ width: px, height: px, boxShadow: `0 0 0 2px ${color.hex}`, backgroundColor: photoUrl ? "transparent" : color.hex }}
      >
        {photoUrl ? (
          <Image src={photoUrl} alt={registration} width={px} height={px} className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className={`font-bold text-white ${SIZE_TEXT[size]}`}>{helicopterInitials(registration)}</span>
        )}
      </span>
      {showLabel ? <span className="hsv-technical-value font-semibold text-ink">{registration}</span> : null}
    </span>
  );
}
