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
end
