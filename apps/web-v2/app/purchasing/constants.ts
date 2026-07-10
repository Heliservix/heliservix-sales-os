export const purchaseRequestStatuses = [
  "Requested",
  "Quoted",
  "Approved",
  "Ordered",
  "Received",
  "Shipped to vessel",
  "Stored",
  "Installed",
  "Consumed",
  "Closed"
] as const;

// Statuses that still represent "work to do" — used to compute open-order
// counts and to decide whether AURA should treat a part as already being sourced.
export const openPurchaseRequestStatuses = [
  "Requested",
  "Quoted",
  "Approved",
  "Ordered",
  "Received",
  "Shipped to vessel"
] as const;
