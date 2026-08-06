import type { AircraftZone } from "@/lib/aircraft-zones";
import { ZONE_LABEL } from "@/lib/aircraft-zones";

type HelicopterZoneDiagramProps = {
  zone: AircraftZone;
  size?: number;
  showLabel?: boolean;
};

const NEUTRAL = "rgb(var(--color-ink-subtle) / 0.35)";
const HIGHLIGHT = "rgb(var(--color-aviation-amber))";
const HIGHLIGHT_SOFT = "rgb(var(--color-aviation-amber) / 0.18)";

/** Original, simplified side-profile silhouette of a light piston helicopter
 * (schematic, not a traced copy of any manufacturer diagram — deliberately
 * generic enough to represent the fleet's R44s without reproducing any
 * copyrighted technical manual artwork). Highlights one rough zone at a
 * time so a técnico scanning /compliance/bulletins gets an at-a-glance
 * "roughly where on the aircraft" cue next to each bulletin — see
 * lib/aircraft-zones.ts for how a bulletin gets classified into a zone. */
export function HelicopterZoneDiagram({ zone, size = 72, showLabel = false }: HelicopterZoneDiagramProps) {
  const color = (target: AircraftZone) => (zone === target ? HIGHLIGHT : NEUTRAL);
  const width = (target: AircraftZone) => (zone === target ? 2.5 : 1.5);

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <svg width={size} height={(size * 110) / 240} viewBox="0 0 240 110" role="img" aria-label={ZONE_LABEL[zone]}>
        {/* Main rotor disc + mast */}
        <g stroke={color("main_rotor")} strokeWidth={width("main_rotor")} strokeLinecap="round">
          <line x1="40" y1="20" x2="150" y2="20" />
          <line x1="95" y1="20" x2="95" y2="55" />
        </g>
        <circle cx="95" cy="20" r="3" fill={color("main_rotor")} />

        {/* Flight controls / servo area — a small ring at the mast base */}
        <circle
          cx="95"
          cy="56"
          r="7"
          fill={zone === "flight_controls" ? HIGHLIGHT_SOFT : "none"}
          stroke={color("flight_controls")}
          strokeWidth={width("flight_controls")}
        />

        {/* Engine compartment, behind the cabin bubble */}
        <rect x="103" y="60" width="26" height="20" rx="3" fill={zone === "engine" ? HIGHLIGHT_SOFT : "none"} stroke={color("engine")} strokeWidth={width("engine")} />

        {/* Fuel tank, under/behind the cabin */}
        <rect x="80" y="78" width="20" height="12" rx="2" fill={zone === "fuel" ? HIGHLIGHT_SOFT : "none"} stroke={color("fuel")} strokeWidth={width("fuel")} />

        {/* Cabin / cockpit bubble */}
        <path
          d="M50 58 C50 42, 75 40, 95 42 C104 43, 108 50, 108 60 C108 78, 95 90, 75 90 C58 90, 50 76, 50 58 Z"
          fill={zone === "cabin" ? HIGHLIGHT_SOFT : "none"}
          stroke={color("cabin")}
          strokeWidth={width("cabin")}
        />

        {/* Tail boom */}
        <path d="M108 66 C150 66, 190 68, 210 58" fill="none" stroke={NEUTRAL} strokeWidth="1.5" />
        <path d="M108 78 C150 78, 185 76, 205 62" fill="none" stroke={NEUTRAL} strokeWidth="1.5" />

        {/* Tail rotor */}
        <g stroke={color("tail_rotor")} strokeWidth={width("tail_rotor")} strokeLinecap="round">
          <line x1="207" y1="60" x2="207" y2="40" />
          <line x1="198" y1="50" x2="216" y2="50" />
        </g>
        <circle cx="207" cy="50" r="2.5" fill={color("tail_rotor")} />

        {/* Landing skids */}
        <g stroke={color("landing_gear")} strokeWidth={width("landing_gear")} strokeLinecap="round">
          <line x1="55" y1="97" x2="140" y2="97" />
          <line x1="62" y1="90" x2="62" y2="97" />
          <line x1="98" y1="90" x2="98" y2="97" />
          <line x1="132" y1="80" x2="132" y2="97" />
        </g>
      </svg>
      {showLabel ? <span className="text-center text-[10px] leading-tight text-ink-subtle">{ZONE_LABEL[zone]}</span> : null}
    </span>
  );
}
