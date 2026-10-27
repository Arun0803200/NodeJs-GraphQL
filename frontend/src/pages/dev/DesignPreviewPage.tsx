import { useEffect, useState } from "react";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import { getSampleContent, type PersonaKey } from "../../templates/samples";
import type { Lang } from "../../templates/types";

// Dev-only full-page render of a design (used for layout QA). Not routed in production builds.
export function DesignPreviewPage() {
  const params = new URLSearchParams(window.location.search);
  const [state, setState] = useState({
    design: params.get("design") ?? "classic-clean",
    persona: (params.get("for") ?? "corporate") as PersonaKey,
    lang: (params.get("lang") ?? "en") as Lang,
  });

  useEffect(() => {
    (window as any).__setPreview = (design: string, persona: PersonaKey, lang: Lang) => setState({ design, persona, lang });
  }, []);

  return <TemplateRenderer designKey={state.design} content={getSampleContent(state.persona, state.lang)} lang={state.lang} />;
}
