import { Link } from "react-router-dom";
import type { TemplateItem } from "../../lib/templates";
import { hasDiscount, isFree } from "../../lib/templates";
import type { Lang, PortfolioContent } from "../../templates/types";
import { useUiLang } from "../../i18n/UiLang";
import { TemplateThumbnail } from "./TemplateThumbnail";
import { Price } from "./Price";

export function TemplateCard({ template, content, lang, query = "" }: {
  template: TemplateItem; content?: PortfolioContent; lang?: Lang; query?: string;
}) {
  const { t } = useUiLang();
  const detailUrl = `/templates/${template.slug}${query}`;
  return (
    <article className="tpl-card">
      <Link to={detailUrl} className="tpl-card-media">
        <TemplateThumbnail designKey={template.designKey} content={content} lang={lang} />
        <span className={`badge ${isFree(template) ? "badge-free" : "badge-premium"}`}>
          {isFree(template) ? t("card.free") : t("card.premium")}
        </span>
        {hasDiscount(template) && <span className="badge badge-sale">{t("card.sale")}</span>}
        <span className="tpl-card-overlay"><span className="btn btn-light">{t("card.preview")}</span></span>
      </Link>
      <div className="tpl-card-body">
        <div className="tpl-card-title">
          <h3><Link to={detailUrl}>{template.name}</Link></h3>
          <Price template={template} />
        </div>
        <p className="tpl-card-desc">{template.description}</p>
        <div className="tpl-card-foot">
          <div className="tag-row">{template.tags.slice(0, 2).map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
          <Link to={`/templates/${template.slug}/customize${query}`} className="btn btn-primary btn-sm">{t("card.use")}</Link>
        </div>
      </div>
    </article>
  );
}
