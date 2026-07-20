export type Tab = 'blutanalyse' | 'urin' | 'stuhl' | 'allergie';

export type Gender = 'm' | 'f' | 'all';

export type ResultType = 'numeric' | 'qualitative';

export interface LabCategory {
  id: string;
  name: string;
  tab: Tab;
  sortOrder: number;
}

export interface LabSubcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

export interface LabParameter {
  id: string;
  subcategoryId: string;
  name: string;
  unit: string | null;
  descriptionShort: string;
  /** Placeholder field: swap for a real trusted source per parameter. */
  learnMoreUrl: string;
  resultType: ResultType;
  sortOrder: number;
}

export interface LabReferenceRange {
  id: string;
  parameterId: string;
  min: number | null;
  max: number | null;
  qualitativeNormal: string | null;
  gender: Gender;
  ageMin: number | null;
  ageMax: number | null;
}

export interface LabResult {
  id: string;
  userId: string;
  parameterId: string;
  value: number | null;
  valueQualitative: string | null;
  measuredAt: string; // ISO date
  sourceDocumentId: string | null;
}

export type RangeStatus = 'in_range' | 'out_of_range' | 'unknown';

/** A parameter joined with the user's latest result and the applicable reference range. */
export interface ParameterWithResult {
  parameter: LabParameter;
  result: LabResult;
  applicableRange: LabReferenceRange | null;
  status: RangeStatus;
}

export interface SubcategoryOverview {
  subcategory: LabSubcategory;
  parameters: ParameterWithResult[];
}

export interface CategoryOverview {
  category: LabCategory;
  subcategories: SubcategoryOverview[];
}
