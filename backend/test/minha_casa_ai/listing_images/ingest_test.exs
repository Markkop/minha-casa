defmodule MinhaCasaAi.ListingImages.IngestTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.ScrapingAnt
  alias MinhaCasaAi.ListingImages.Ingest

  describe "content_type_from_headers" do
    test "handles Req map headers with list values" do
      headers = %{"content-type" => ["image/webp"], "cache-control" => ["max-age=315360000"]}

      assert Ingest.content_type_from_headers(headers) == "image/webp"
    end

    test "handles tuple list headers" do
      headers = [{"content-type", "image/jpeg; charset=utf-8"}]

      assert Ingest.content_type_from_headers(headers) == "image/jpeg"
    end
  end

  describe "top image url ordering" do
    test "image_url_score prefers larger dimensions" do
      small = "https://resizedimgs.vivareal.com/x?dimension=100x100"
      large = "https://resizedimgs.vivareal.com/x?dimension=800x600"

      assert ScrapingAnt.image_url_score(large) > ScrapingAnt.image_url_score(small)
    end
  end

  describe "extract_image_urls_from_html/1" do
    test "dedupes vr-listing hashes" do
      html = """
      <img src="https://resizedimgs.vivareal.com/vr-listing/abc/photo1.jpg?dimension=100x100" />
      <img src="https://resizedimgs.vivareal.com/vr-listing/abc/photo2.jpg?dimension=800x600" />
      """

      urls = ScrapingAnt.extract_image_urls_from_html(html)
      assert length(urls) == 1
      assert hd(urls) =~ "800x600"
    end
  end

  describe "extract_og_image_url_from_html/1" do
    test "reads og:image meta content" do
      html = """
      <head>
        <meta property="og:image" content="https://cdn.example.com/hero.jpg" />
      </head>
      """

      assert ScrapingAnt.extract_og_image_url_from_html(html) ==
               "https://cdn.example.com/hero.jpg"
    end

    test "ignores blocked og images" do
      html = ~s(<meta property="og:image" content="https://cdn.example.com/logo.png" />)

      assert ScrapingAnt.extract_og_image_url_from_html(html) == nil
    end
  end

  describe "top_image_urls og priority" do
    test "places og image first even when lower score" do
      og = "https://cdn.example.com/og-thumb.jpg"
      large = "https://resizedimgs.vivareal.com/x?dimension=800x600"
      small = "https://resizedimgs.vivareal.com/y?dimension=100x100"

      ordered =
        [small, large]
        |> Enum.sort_by(&ScrapingAnt.image_url_score/1, :desc)
        |> Enum.reject(&ScrapingAnt.same_listing_image?(&1, og))
        |> then(fn rest -> [og | rest] end)

      assert hd(ordered) == og
      assert length(ordered) == 3
    end
  end
end
