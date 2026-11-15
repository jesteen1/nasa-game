import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FAILURE_GUIDE } from "../data/failureGuide";
import FailureList from "./FailureList";

describe("FailureList", () => {
  it("renders every failure on the default no-hash view", () => {
    const html = renderToStaticMarkup(<FailureList />);

    for (const entry of FAILURE_GUIDE) {
      expect(html).toContain(`id="${entry.id}"`);
    }
    expect(html).toContain("What to change");
    expect(html).not.toContain("your last failure");
    expect(html).not.toContain("Showing the fix for");
  });
});
