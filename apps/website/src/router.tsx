import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "./layouts/RootLayout";
import { DocsLayout } from "./layouts/DocsLayout";
import { HomePage } from "./pages/HomePage";
import { QuickStartPage } from "./pages/docs/QuickStartPage";
import { ConfigReferencePage } from "./pages/docs/ConfigReferencePage";
import { MonorepoGuidePage } from "./pages/docs/MonorepoGuidePage";
import { ComponentAuthoringPage } from "./pages/docs/ComponentAuthoringPage";
import { AutoDocsPage } from "./pages/docs/AutoDocsPage";
import { TideFolderPage } from "./pages/docs/TideFolderPage";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const docsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsLayout,
});

const docsIndexRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/docs/quick-start" });
  },
});

const quickStartRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "quick-start",
  component: QuickStartPage,
});

const configReferenceRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "config-reference",
  component: ConfigReferencePage,
});

const monorepoRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "monorepo",
  component: MonorepoGuidePage,
});

const componentAuthoringRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "component-authoring",
  component: ComponentAuthoringPage,
});

const tideFolderRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "tide-folder",
  component: TideFolderPage,
});

const autoDocsRoute = createRoute({
  getParentRoute: () => docsLayoutRoute,
  path: "docs",
  component: AutoDocsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  docsLayoutRoute.addChildren([
    docsIndexRoute,
    quickStartRoute,
    configReferenceRoute,
    monorepoRoute,
    componentAuthoringRoute,
    tideFolderRoute,
    autoDocsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
