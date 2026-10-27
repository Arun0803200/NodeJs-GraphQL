import { createContext, useContext } from "react";
import type { Lang, RatingType, ReviewTarget } from "../types";
import type { TravelT } from "./labels";

export interface Summary { typeId: string; target: string; targetId: string | null; avg: number; count: number; criteria: { id: string; avg: number }[] }
export interface ReviewItem {
  id: number; typeId: string; target: string; targetId: string | null; rating: number; criteria: Record<string, number>;
  comment: string | null; reviewerName: string; ownerReply: string | null; createdAt: string;
}

export interface ReviewsCtx {
  types: RatingType[];
  summary: Summary[];
  reviews: ReviewItem[];
  sample: boolean;
  lang: Lang;
  t: TravelT;
  ownerName: string;
  open: (typeId?: string, targetId?: string) => void;
  // Rating types that apply to a target kind, enabled only
  typesFor: (target: ReviewTarget) => RatingType[];
}

export const ReviewsContext = createContext<ReviewsCtx | null>(null);
export const useReviews = () => useContext(ReviewsContext);

