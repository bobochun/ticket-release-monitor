import type { ParsedAvailability, Target } from "../../shared/types";

export type AvailabilityParserInput = {
  target: Target;
  html: string;
  text: string;
};

export type AvailabilityParser = (input: AvailabilityParserInput) => ParsedAvailability;
