import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BrandMark from "./BrandMark";

describe("brand mark", () => {
  it("renders the SVG rocket logo", () => {
    const html = renderToStaticMarkup(<BrandMark className="h-8 w-8" />);
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 64 64"');
    expect(html).toContain("h-8 w-8");
    expect(html).toContain('fill="#eaf4fb"');
  });

  it("ships the standalone logo, wordmark and favicon assets", () => {
    for (const file of ["public/logo.svg", "public/logo-wordmark.svg", "app/icon.svg"]) {
      expect(existsSync(join(process.cwd(), file)), `${file} is missing`).toBe(true);
    }
  });
});
