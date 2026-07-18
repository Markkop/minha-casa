defmodule MinhaCasaAi.Integrations.ListingParserAttachmentTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Attachments.Attachment
  alias MinhaCasaAi.Integrations.ListingParser

  test "materializes an attachment reference for the owning workspace" do
    attachment_id = Ecto.UUID.generate()
    workspace_id = Ecto.UUID.generate()

    loader = fn ^attachment_id, ^workspace_id ->
      {:ok, %Attachment{content_type: "image/png"}, Base.encode64("image-bytes")}
    end

    assert {:ok, materialized} =
             ListingParser.materialize_attachment(
               %{
                 "kind" => "image",
                 "attachmentId" => attachment_id,
                 "mimeType" => "image/jpeg"
               },
               workspace_id: workspace_id,
               attachment_loader: loader
             )

    assert materialized == %{
             "kind" => "image",
             "base64" => Base.encode64("image-bytes"),
             "mimeType" => "image/png"
           }
  end

  test "does not resolve references without a workspace" do
    assert {:error, :missing_workspace} =
             ListingParser.materialize_attachment(%{"attachmentId" => Ecto.UUID.generate()}, [])
  end

  test "passes through a scoped not-found error" do
    loader = fn _attachment_id, _workspace_id -> {:error, :attachment_not_found} end

    assert {:error, :attachment_not_found} =
             ListingParser.materialize_attachment(
               %{"attachmentId" => Ecto.UUID.generate()},
               workspace_id: Ecto.UUID.generate(),
               attachment_loader: loader
             )
  end
end
