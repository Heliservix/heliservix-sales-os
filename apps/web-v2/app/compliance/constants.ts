export const complianceAuthorities = ["AAC Panama", "DGAC Ecuador", "FAA", "Robinson", "Other"] as const;

export const complianceTypes = [
  "AD",
  "SB",
  "Service Letter",
  "Manual Revision",
  "Operational Requirement",
  "Life Limit"
] as const;

export const complianceStatuses = [
  "Not reviewed",
  "Applicable",
  "Not applicable",
  "In progress",
  "Complied",
  "Overdue"
] as const;
