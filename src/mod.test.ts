import { applyLayouts, applyManifestLayouts } from "./mod.ts";
import { assert } from "./test-deps.ts";
import { PageProps, h } from "./deps.ts";
import { Layout, Page } from "../mod.ts";
import { Module } from "./types.ts";
import { assertEquals } from "https://deno.land/std@0.184.0/testing/asserts.ts";
import { ComponentChild, ComponentChildren } from "https://esm.sh/v116/preact@10.13.1/src/index.js";

Deno.test("fresh layout tests", async (t) => {
  await t.step("_layout only works", () => {
    let didRun = false;

    const manifest = {
      routes: {
        "./routes/_layout.tsx": {
          default: (child: Page, props?: PageProps) => {
            didRun = true;
            return h('main', {}, child(props))
          },
        },
        "./routes/index.tsx": {
          default: () => h('div', {}),
        },
      },
      islands: {},
      baseUrl: "",
    }

    const layoutManifest = applyManifestLayouts(manifest);

    const layout = (layoutManifest.routes["./routes/index.tsx"]! as Module).default! as Layout;
    const page = manifest.routes["./routes/index.tsx"]!.default! as Page;
    const pageProps = {} as PageProps;

    layout(page, pageProps)
    assert(didRun, "layout did not run");
  })

  await t.step("page only works", () => {
    const orderRan: number[] = [];
    let i = 0;
    const manifest = {
      routes: {
        "./routes/index.tsx": {
          default: applyLayouts(() => {
            return h('div', {});
          }, [(child: Page, props?: PageProps) => {
            orderRan.push(0);
            i++;
            return h('main', {}, child(props))
          }, (child: Page, props?: PageProps) => {
            orderRan.push(1);
            i++;
            return h('main', {}, child(props))
          }, (child: Page, props?: PageProps) => {
            orderRan.push(2);
            i++;
            return h('main', {}, child(props))
          }]),
        }
      },
      islands: {},
      baseUrl: "",
    }

    const layoutManifest = applyManifestLayouts(manifest);

    const layout = (layoutManifest.routes["./routes/index.tsx"]! as Module).default! as Layout;
    const page = manifest.routes["./routes/index.tsx"]!.default! as Page;
    const pageProps = {} as PageProps;

    layout(page, pageProps)
    assertEquals(orderRan, [0, 1, 2], "layouts did not run");
  })

  await t.step("_middleware only works", () => {
    let didRun = false;

    const manifest = {
      routes: {
        "./routes/_middleware.tsx": {
          default: (_, ctx) => ctx.next(),
          config: {
            layout: (children: ComponentChildren) => {
              didRun = true;
              return h('main', {}, children)
            }
          }
        },
        "./routes/index.tsx": {
          default: () => h('div', {}),
        },
      },
      islands: {},
      baseUrl: "",
    }

    const layoutManifest = applyManifestLayouts(manifest);

    const layout = (layoutManifest.routes["./routes/index.tsx"]! as Module).default!;
    const page = manifest.routes["./routes/index.tsx"]!.default! as Page;
    const pageProps = {} as PageProps;

    console.log(layout.toString())

    console.log(layout(page, pageProps))
    assert(didRun, "layout did not run");
  })
})