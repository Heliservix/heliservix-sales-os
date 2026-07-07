import type { AlertSeverity, ComponentStatus, HelicopterStatus } from "@/types/fleet";

export function componentTone(status: ComponentStatus) {
  if (status === "OK") return "green";
  if (status === "Monitor") return "amber";
  if (status === "Critical") return "red";
  if (status === "Removed") return "neutral";
  return "red";
}

export function helicopterTone(status: HelicopterStatus) {
  if (status === "Available") return "green";
  if (status === "Assigned" || status === "In Campaign") return "teal";
  if (status === "Maintenance") return "amber";
  if (status === "Grounded") return "red";
  return "neutral";
}

export function alertTone(severity: AlertSeverity) {
  if (severity === "Info") return "blue";
  if (severity === "Monitor") return "amber";
  if (severity === "Critical") return "red";
  return "red";
}

export function readinessTone(readiness: number) {
  if (readiness >= 85) return "green";
  if (readiness >= 60) return "amber";
  return "red";
}
