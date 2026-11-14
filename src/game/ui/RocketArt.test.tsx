import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RocketArt from "./RocketArt";

describe("RocketArt", () => {
  it("renders the 2D launch vehicle with the idle animation", () => {
    const markup = renderToStaticMarkup(<RocketArt mode="idle" />);
    expect(markup).toContain("rocket-craft");
    expect(markup).toContain("rocket-flame");
    expect(markup).toContain("RS-01");
    expect(markup).not.toContain("is-launching");
  });

  it("adds the liftoff and hidden states", () => {
    expect(renderToStaticMarkup(<RocketArt mode="launching" />)).toContain("is-launching");
    expect(renderToStaticMarkup(<RocketArt mode="away" />)).toContain("is-away");
  });
});
