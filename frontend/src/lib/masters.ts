import { useQuery } from "@apollo/client/react";
import { MASTER_BUNDLE } from "../api/queries";

// Codes of the system masters seeded by the backend (src/Seeds/masters.ts)
export const MASTER = {
  skillCategory: "skill_category",
  skill: "skill",
  degree: "degree",
  fieldOfStudy: "field_of_study",
  designation: "designation",
  socialPlatform: "social_platform",
  templateTag: "template_tag",
} as const;

export interface MasterOption {
  id: number;
  code: string;
  label: string;
  description: string;
  parentId: number | null;
  parentCode: string | null;
  parentLabel: string | null;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: MasterOption[] = [];

// Loads several masters in one request; returns code -> active options (empty while loading or if a master is missing)
export function useMasters(codes: string[]) {
  const { data, loading } = useQuery<any>(MASTER_BUNDLE, { variables: { typeCodes: codes }, fetchPolicy: "cache-and-network" });
  const groups: { typeCode: string; options: MasterOption[] }[] = data?.masterBundle?.data ?? [];
  const byCode = new Map(groups.map((g) => [g.typeCode, g.options]));
  return { loading, options: (code: string) => byCode.get(code) ?? EMPTY };
}
