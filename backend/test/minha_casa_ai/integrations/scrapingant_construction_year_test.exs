defmodule MinhaCasaAi.Integrations.ScrapingAntConstructionYearTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.ScrapingAnt

  test "extracts explicit construction year keys recursively from JSON-LD" do
    html = """
    <script type="application/ld+json">
      {"@graph":[{"@type":"House","yearBuilt":"1998"}]}
    </script>
    """

    assert ScrapingAnt.extract_construction_year_from_html(html) == 1998
  end

  test "supports the explicit constructionYear and yearOfConstruction aliases" do
    html = """
    <script type='application/ld+json'>
      [{"constructionYear":2025},{"yearOfConstruction":"2025"}]
    </script>
    """

    assert ScrapingAnt.extract_construction_year_from_html(html) == 2025
  end

  test "accepts an explicitly declared future completion year" do
    future_year = Date.utc_today().year + 2

    html = """
    <script type="application/ld+json">{"yearBuilt":#{future_year}}</script>
    """

    assert ScrapingAnt.extract_construction_year_from_html(html) == future_year
  end

  test "ignores generic dates and conflicting explicit metadata" do
    generic = """
    <script type="application/ld+json">
      {"datePublished":"2024-01-01","dateModified":"2026-01-01"}
    </script>
    """

    conflicting = """
    <script type="application/ld+json">
      {"@graph":[{"yearBuilt":1998},{"constructionYear":2001}]}
    </script>
    """

    assert ScrapingAnt.extract_construction_year_from_html(generic) == nil
    assert ScrapingAnt.extract_construction_year_from_html(conflicting) == nil
  end
end
