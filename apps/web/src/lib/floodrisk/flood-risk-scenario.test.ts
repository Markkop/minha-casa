import { describe, expect, it } from "vitest";
import { shortenScenarioLabel } from "./flood-risk-scenario";

describe("shortenScenarioLabel", () => {
  it("keeps labels with at most five words", () => {
    expect(shortenScenarioLabel("Evento intenso novembro 2023")).toBe("Evento intenso novembro 2023");
  });

  it("truncates longer labels to five words", () => {
    expect(
      shortenScenarioLabel("Projecao de inundacao extrema para o ano de 2050 na regiao")
    ).toBe("Projecao de inundacao extrema para");
  });
});
