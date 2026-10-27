import type { ComponentType } from "react";
import type { Lang, LayoutKey, LayoutProps, PortfolioContent } from "./types";
import { getDesign } from "./registry";
import { ClassicLayout } from "./layouts/ClassicLayout";
import { MinimalLayout } from "./layouts/MinimalLayout";
import { SidebarLayout } from "./layouts/SidebarLayout";
import { HeroLayout } from "./layouts/HeroLayout";
import { TimelineLayout } from "./layouts/TimelineLayout";
import { ExecutiveLayout } from "./layouts/ExecutiveLayout";
import { BentoLayout } from "./layouts/BentoLayout";
import { TravelLayout, TravelSplitLayout } from "./layouts/TravelLayout";
import "./templates.css";

const LAYOUTS: Record<LayoutKey, ComponentType<LayoutProps>> = {
  classic: ClassicLayout,
  minimal: MinimalLayout,
  sidebar: SidebarLayout,
  hero: HeroLayout,
  timeline: TimelineLayout,
  executive: ExecutiveLayout,
  bento: BentoLayout,
  travel: TravelLayout,
  travelsplit: TravelSplitLayout,
};

// `owner` is the published site's username; booking forms only submit when it is set
export function TemplateRenderer({ designKey, content, lang = "en", owner }: { designKey: string; content: PortfolioContent; lang?: Lang; owner?: string }) {
  const design = getDesign(designKey);
  const Layout = LAYOUTS[design.layout];
  return <Layout content={content} theme={design.theme} tier={design.tier} lang={lang} owner={owner} />;
}
