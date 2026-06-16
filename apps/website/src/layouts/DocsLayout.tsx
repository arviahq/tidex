import { Link, Outlet } from "@tanstack/react-router";
import { DOC_NAV } from "../docs/nav";
import "../docs.css";

export function DocsLayout() {
  return (
    <div className="docs-layout">
      <aside className="docs-layout__sidebar">
        <p className="docs-layout__label">Documentation</p>
        <nav className="docs-layout__nav" aria-label="Documentation">
          {DOC_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "docs-layout__link docs-layout__link--active" }}
              inactiveProps={{ className: "docs-layout__link" }}
              activeOptions={{ exact: true }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="docs-layout__main">
        <Outlet />
      </div>
    </div>
  );
}
