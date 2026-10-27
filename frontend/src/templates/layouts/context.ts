import { createContext, useContext } from "react";
import { getLabels } from "../i18n";
import type { TemplateLabels } from "../i18n";
import type { AlbumView } from "./view";

export type OpenLightbox = (items: AlbumView[], index: number) => void;

export const LightboxContext = createContext<OpenLightbox>(() => {});
export const LabelsContext = createContext<TemplateLabels>(getLabels("en"));

/** Fixed template words in the page language. */
export function useLabels(): TemplateLabels {
  return useContext(LabelsContext);
}

/** Returns a function that opens the template's shared photo lightbox. */
export function useLightbox(): OpenLightbox {
  return useContext(LightboxContext);
}
