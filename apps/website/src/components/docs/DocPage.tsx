import type { ReactNode } from "react";

type DocPageProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DocPage({ title, description, children }: DocPageProps) {
  return (
    <article className="doc-page">
      <header className="doc-page__header">
        <h1 className="doc-page__title">{title}</h1>
        {description ? <p className="doc-page__description">{description}</p> : null}
      </header>
      <div className="doc-page__body">{children}</div>
    </article>
  );
}
