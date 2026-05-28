import { addDays, addBusinessDays, isWeekend, nextMonday } from "date-fns";
import { DEADLINE_WARNING } from "@/lib/constants";

type CalculationType = "CALENDAR_DAYS" | "COURT_DAYS" | "BUSINESS_DAYS";

export type DeadlineCalculationInput = {
  triggerDate: Date;
  responseDays: number;
  calculationType: CalculationType;
  serviceExtensionDays?: number;
  serviceMethod?: string | null;
};

export type DeadlineCalculationResult = {
  calculatedDeadlineDate: Date;
  explanation: string;
  warning: string;
};

function normalizeDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

function addCourtDays(date: Date, days: number) {
  return addBusinessDays(date, days);
}

function adjustForWeekend(date: Date) {
  if (isWeekend(date)) {
    return nextMonday(date);
  }

  return date;
}

export function calculateDraftDeadline(
  input: DeadlineCalculationInput
): DeadlineCalculationResult {
  const normalizedTriggerDate = normalizeDateOnly(input.triggerDate);
  const serviceExtensionDays = input.serviceExtensionDays ?? 0;
  const totalDays = input.responseDays + serviceExtensionDays;

  let calculated: Date;

  switch (input.calculationType) {
    case "BUSINESS_DAYS":
      calculated = addBusinessDays(normalizedTriggerDate, totalDays);
      break;
    case "COURT_DAYS":
      calculated = addCourtDays(normalizedTriggerDate, totalDays);
      break;
    case "CALENDAR_DAYS":
    default:
      calculated = addDays(normalizedTriggerDate, totalDays);
      break;
  }

  const adjusted = adjustForWeekend(normalizeDateOnly(calculated));

  return {
    calculatedDeadlineDate: adjusted,
    explanation: [
      `Base trigger date: ${normalizedTriggerDate.toISOString().slice(0, 10)}.`,
      `Calculation type: ${input.calculationType}.`,
      `Response period: ${input.responseDays} days.`,
      `Service extension applied: ${serviceExtensionDays} day(s)${input.serviceMethod ? ` for ${input.serviceMethod}` : ""}.`,
      adjusted.getTime() !== calculated.getTime()
        ? "Deadline adjusted forward because the initial result landed on a weekend."
        : "No weekend adjustment applied."
    ].join(" "),
    warning: DEADLINE_WARNING
  };
}
