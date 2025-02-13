import { Manifest, PageProps } from "./deps.ts";
import { buildTrie, getRouteInfoBranch } from "./trie.ts";
import { Layout, Module, Page, RouteInfo } from "./types.ts";
import { isMiddleware, is404, is500, isApp, isLayout } from "./utils.ts";

// deno-lint-ignore no-explicit-any
const wrap = <Data = any>(page: Page<Data>, layout: Layout<Data>) => {
  return (props?: PageProps<Data>) => layout(page, props);
};

// deno-lint-ignore no-explicit-any
export const applyLayouts = <Data = any>(
  page: Page<Data>,
  layouts: Layout<Data>[]
): Page<Data> => {
  if (layouts.length === 0) {
    return page;
  }

  return wrap(applyLayouts(page, layouts.slice(1)), layouts[0]);
};

export const applyManifestLayouts = (manifest: Manifest): Manifest => {
  const layoutRoutes: RouteInfo[] = [];
  const pageRoutes: RouteInfo[] = [];
  // deno-lint-ignore no-explicit-any
  const rest: { path: string; module: any }[] = [];

  Object.entries(manifest.routes).forEach((entry) => {
    const [route, mod] = entry;

    const i = route.lastIndexOf("/");
    const routeFileName = route.slice(i + 1);

    if (
      isMiddleware(routeFileName) ||
      is404(routeFileName) ||
      is500(routeFileName) ||
      isApp(routeFileName)
    ) {
      rest.push({ path: route, module: mod });
    } else {
      const module = mod as Module;
      if (module.default) {
        if (isLayout(routeFileName)) {
          const routeDir = route.slice(0, i);
          layoutRoutes.push({ path: routeDir, module });
        } else {
          pageRoutes.push({ path: route, module });
        }
      }
    }
  });

  const trie = buildTrie([...layoutRoutes, ...pageRoutes], "/");

  pageRoutes.forEach((ri) => {
    const branch = getRouteInfoBranch(ri, ri.path.split("/"), trie);
    const lastIndex = branch.length - 1;

    const page = applyLayouts(
      branch[lastIndex].module.default as Page,
      branch.slice(0, lastIndex).map((ri) => ri.module.default as Layout)
    );

    ri.module = { ...ri.module, default: page };
  });

  return {
    ...manifest,
    routes: Object.fromEntries(
      [...rest, ...pageRoutes].map(({ path, module }) => [path, module])
    ),
  };
};
