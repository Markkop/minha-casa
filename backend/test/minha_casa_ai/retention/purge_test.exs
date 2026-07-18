defmodule MinhaCasaAi.Retention.PurgeTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Attachments.Attachment
  alias MinhaCasaAi.Audit.AuditEvent
  alias MinhaCasaAi.Chat.{Conversation, Message}
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Retention
  alias MinhaCasaAi.Retention.Purge
  alias MinhaCasaAi.Workflows.WorkflowRun
  alias MinhaCasaAi.Workspaces.Workspace

  setup do
    :ok = Oban.pause_queue(queue: :storage)
    :ok = Oban.pause_queue(queue: :retention)

    user_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
      [
        Ecto.UUID.dump!(user_id),
        "retention-#{System.unique_integer([:positive])}@example.com",
        "Retention test"
      ]
    )

    workspace =
      %Workspace{}
      |> Workspace.changeset(%{
        type: "personal",
        owner_user_id: user_id,
        name: "Retention test",
        status: "active"
      })
      |> Repo.insert!()

    now = DateTime.utc_now(:second)

    Workspace
    |> where([stored], stored.id == ^workspace.id)
    |> Repo.update_all(
      set: [
        retention_status: "active",
        retention_plan_slug: "free",
        retention_last_activity_at: DateTime.add(now, -31, :day),
        retention_expires_at: DateTime.add(now, -1, :second)
      ]
    )

    on_exit(fn -> cleanup!(workspace.id, user_id) end)

    %{now: now, user_id: user_id, workspace: Repo.get!(Workspace, workspace.id)}
  end

  test "purges owned binary content, redacts references, and preserves chat text", %{
    now: now,
    user_id: user_id,
    workspace: workspace
  } do
    collection = insert_collection!(workspace.id, user_id)
    listing = insert_listing!(collection.id)
    attachment = insert_attachment!(workspace.id, user_id)
    conversation = insert_conversation!(workspace.id, user_id, attachment.id)
    message = insert_message!(conversation.id, attachment.id)
    workflow = insert_workflow!(workspace.id, user_id, attachment.id)
    insert_duplicate_candidate!(workflow.id, listing.id)

    assert {:ok, %{status: :purged, collections: 1, listings: 1, attachments: 1}} =
             Purge.purge_workspace(workspace.id, now)

    refute Repo.get(Collection, collection.id)
    refute Repo.get(Listing, listing.id)
    refute Repo.get(Attachment, attachment.id)

    stored_message = Repo.get!(Message, message.id)
    assert stored_message.content == "Quero guardar apenas este texto"
    assert stored_message.attachments == []
    refute Map.has_key?(stored_message.metadata["parser_input"], "base64")
    refute Map.has_key?(stored_message.metadata["parser_input"], "attachmentId")

    stored_conversation = Repo.get!(Conversation, conversation.id)
    refute Map.has_key?(stored_conversation.metadata, "pending")
    refute Map.has_key?(stored_conversation.metadata["parser_input"], "base64")
    refute Map.has_key?(stored_conversation.metadata["parser_input"], "attachmentId")

    stored_workflow = Repo.get!(WorkflowRun, workflow.id)
    refute Map.has_key?(stored_workflow.input, "base64")
    refute Map.has_key?(stored_workflow.input, "attachmentId")
    assert is_nil(stored_workflow.result)

    assert %{retention_status: "purged", content_purged_at: ^now} =
             Repo.get!(Workspace, workspace.id)

    assert %AuditEvent{action: "retention.content_purged"} =
             Repo.get_by!(AuditEvent,
               workspace_id: workspace.id,
               action: "retention.content_purged"
             )

    cleanup_job =
      Oban.Job
      |> where([job], job.worker == "MinhaCasaAi.Workers.StorageCleanupWorker")
      |> order_by([job], desc: job.id)
      |> Repo.one!()

    assert attachment.storage_key in cleanup_job.args["keys"]
    assert "listings/#{listing.id}/" in cleanup_job.args["prefixes"]
    assert "attachments/#{workspace.id}/" in cleanup_job.args["prefixes"]

    assert :ok = Retention.record_activity(workspace.id, DateTime.add(now, 1, :second))
    renewed = Repo.get!(Workspace, workspace.id)
    assert renewed.retention_status == "active"
    assert renewed.retention_plan_slug == "free"

    assert DateTime.diff(renewed.retention_expires_at, renewed.retention_last_activity_at, :day) ==
             30
  end

  test "rechecks the deadline under lock and skips a renewed workspace", %{
    now: now,
    workspace: workspace
  } do
    assert :ok = Retention.record_activity(workspace.id, now)
    assert {:ok, %{status: :skipped, reason: :renewed}} = Purge.purge_workspace(workspace.id, now)
    assert Repo.get!(Workspace, workspace.id).retention_status == "active"
  end

  defp insert_collection!(workspace_id, user_id) do
    %Collection{}
    |> Collection.changeset(%{
      workspace_id: workspace_id,
      user_id: user_id,
      created_by_user_id: user_id,
      responsible_user_id: user_id,
      name: "Collection under retention"
    })
    |> Repo.insert!()
  end

  defp insert_listing!(collection_id) do
    %Listing{}
    |> Listing.changeset(%{
      collection_id: collection_id,
      data: %{
        "title" => "Imóvel expirado",
        "imageStorageKeys" => ["listings/legacy/image.jpg"]
      }
    })
    |> Repo.insert!()
  end

  defp insert_attachment!(workspace_id, user_id) do
    %Attachment{}
    |> Attachment.changeset(%{
      workspace_id: workspace_id,
      user_id: user_id,
      storage_key: "attachments/#{workspace_id}/legacy.pdf",
      filename: "legacy.pdf",
      content_type: "application/pdf",
      byte_size: 128,
      source: "test"
    })
    |> Repo.insert!()
  end

  defp insert_conversation!(workspace_id, user_id, attachment_id) do
    %Conversation{}
    |> Conversation.changeset(%{
      workspace_id: workspace_id,
      user_id: user_id,
      channel: "whatsapp",
      metadata: %{
        "pending" => %{"listing" => %{"image" => "data:image/jpeg;base64,legacy"}},
        "parser_input" => %{
          "kind" => "image",
          "base64" => "legacy",
          "attachmentId" => attachment_id
        }
      }
    })
    |> Repo.insert!()
  end

  defp insert_message!(conversation_id, attachment_id) do
    %Message{}
    |> Message.changeset(%{
      conversation_id: conversation_id,
      role: "user",
      content: "Quero guardar apenas este texto",
      attachments: [%{"attachmentId" => attachment_id}],
      metadata: %{
        "parser_input" => %{
          "kind" => "pdf",
          "base64" => "legacy",
          "attachmentId" => attachment_id
        }
      }
    })
    |> Repo.insert!()
  end

  defp insert_workflow!(workspace_id, user_id, attachment_id) do
    %WorkflowRun{}
    |> WorkflowRun.changeset(%{
      workspace_id: workspace_id,
      user_id: user_id,
      kind: "listing_ingestion",
      status: "ready_to_save",
      input: %{"kind" => "image", "base64" => "legacy", "attachmentId" => attachment_id},
      result: %{"listings" => [%{"title" => "Imóvel expirado"}]}
    })
    |> Repo.insert!()
  end

  defp insert_duplicate_candidate!(workflow_id, listing_id) do
    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO ai_duplicate_candidates
        (id, workflow_run_id, listing_id, score, metadata, inserted_at, updated_at)
      VALUES ($1, $2, $3, 0.99, '{}'::jsonb, now(), now())
      """,
      [
        Ecto.UUID.dump!(Ecto.UUID.generate()),
        Ecto.UUID.dump!(workflow_id),
        Ecto.UUID.dump!(listing_id)
      ]
    )
  end

  defp cleanup!(workspace_id, user_id) do
    conversation_ids =
      Conversation
      |> where([conversation], conversation.workspace_id == ^workspace_id)
      |> select([conversation], conversation.id)
      |> Repo.all()

    if conversation_ids != [] do
      Repo.delete_all(
        from message in Message, where: message.conversation_id in ^conversation_ids
      )
    end

    Repo.delete_all(
      from conversation in Conversation, where: conversation.id in ^conversation_ids
    )

    Repo.delete_all(from workflow in WorkflowRun, where: workflow.workspace_id == ^workspace_id)

    Repo.delete_all(
      from attachment in Attachment, where: attachment.workspace_id == ^workspace_id
    )

    Repo.delete_all(
      from collection in Collection, where: collection.workspace_id == ^workspace_id
    )

    Repo.delete_all(from event in AuditEvent, where: event.workspace_id == ^workspace_id)

    Repo.delete_all(
      from job in Oban.Job,
        where:
          job.worker in [
            "MinhaCasaAi.Workers.StorageCleanupWorker",
            "MinhaCasaAi.Workers.WorkspaceRetentionPurgeWorker"
          ]
    )

    Repo.delete_all(from workspace in Workspace, where: workspace.id == ^workspace_id)

    Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
      Ecto.UUID.dump!(user_id)
    ])

    Oban.resume_queue(queue: :retention)
    Oban.resume_queue(queue: :storage)
  end
end
