export interface SeedDocument {
  category: 'bible' | 'egw' | 'manual';
  title: string;
  abbreviation: string | null;
  translation: string | null;
  driveFileId: string;
}

export const BIBLE_SEED: SeedDocument[];
export const MANUAL_SEED: SeedDocument[];
export const KNOWN_EGW_TITLES: Record<string, string>;
export const EGW_SEED: Array<{ abbreviation: string; driveFileId: string }>;
export function titleForAbbreviation(abbr: string): string;
