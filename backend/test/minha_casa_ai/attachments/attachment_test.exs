defmodule MinhaCasaAi.Attachments.AttachmentTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Attachments.Attachment

  test "requires workspace ownership" do
    changeset =
      Attachment.changeset(%Attachment{}, %{
        storage_key: "attachments/file.jpg",
        content_type: "image/jpeg",
        byte_size: 10,
        source: "web"
      })

    refute changeset.valid?
    assert {"can't be blank", _} = changeset.errors[:workspace_id]
  end

  test "accepts a workspace-owned attachment" do
    changeset =
      Attachment.changeset(%Attachment{}, %{
        workspace_id: Ecto.UUID.generate(),
        storage_key: "attachments/file.jpg",
        content_type: "image/jpeg",
        byte_size: 10,
        source: "telegram"
      })

    assert changeset.valid?
  end
end
