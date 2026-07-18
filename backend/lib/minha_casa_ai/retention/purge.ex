defmodule MinhaCasaAi.Retention.Purge do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.Attachments.Attachment
  alias MinhaCasaAi.Audit
  alias MinhaCasaAi.Chat.{Conversation, Message}
  alias MinhaCasaAi.ListingImages.StorageCleanup
  alias MinhaCasaAi.Listings.{Collection, Deletion, Listing, ListingMergeSession}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Retention.Policy
  alias MinhaCasaAi.Workflows.WorkflowRun
  alias MinhaCasaAi.Workspaces.Workspace

  def purge_workspace(workspace_id, now \\ DateTime.utc_now(:second))

  def purge_workspace(workspace_id, %DateTime{} = now) when is_binary(workspace_id) do
    Repo.transaction(fn ->
      workspace =
        Workspace
        |> where([workspace], workspace.id == ^workspace_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      workspace = refresh_effective_retention!(workspace, now)

      cond do
        is_nil(workspace) ->
          Repo.rollback(:workspace_not_found)

        workspace.retention_status != "active" ->
          %{status: :skipped, reason: :not_active}

        DateTime.compare(workspace.retention_expires_at, now) == :gt ->
          %{status: :skipped, reason: :renewed}

        true ->
          purge_locked_workspace!(workspace, now)
      end
    end)
  end

  def purge_workspace(_workspace_id, _now), do: {:error, :invalid_workspace}

  defp refresh_effective_retention!(%Workspace{} = workspace, now) do
    case Ecto.Adapters.SQL.query!(
           Repo,
           "SELECT retention_plan_slug_for_workspace($1::uuid, $2::timestamptz)",
           [Ecto.UUID.dump!(workspace.id), now]
         ) do
      %{rows: [[plan_slug]]} when is_binary(plan_slug) ->
        with {:ok, days} <- Policy.days_for_slug(plan_slug),
             %DateTime{} = last_activity <- workspace.retention_last_activity_at do
          expires_at = DateTime.add(last_activity, days, :day)

          if workspace.retention_plan_slug != plan_slug or
               is_nil(workspace.retention_expires_at) or
               DateTime.compare(workspace.retention_expires_at, expires_at) != :eq do
            {1, _} =
              Workspace
              |> where([stored], stored.id == ^workspace.id)
              |> Repo.update_all(
                set: [
                  retention_plan_slug: plan_slug,
                  retention_expires_at: expires_at,
                  updated_at: now
                ]
              )

            %{workspace | retention_plan_slug: plan_slug, retention_expires_at: expires_at}
          else
            workspace
          end
        else
          _ -> workspace
        end

      _ ->
        workspace
    end
  end

  defp purge_locked_workspace!(workspace, now) do
    collections =
      Collection
      |> where([collection], collection.workspace_id == ^workspace.id)
      |> lock("FOR UPDATE")
      |> Repo.all()

    collection_ids = Enum.map(collections, & &1.id)

    listings =
      Listing
      |> where([listing], listing.collection_id in ^collection_ids)
      |> lock("FOR UPDATE")
      |> Repo.all()

    merge_session_ids =
      ListingMergeSession
      |> where([session], session.collection_id in ^collection_ids)
      |> select([session], session.id)
      |> Repo.all()

    attachments =
      Attachment
      |> where([attachment], attachment.workspace_id == ^workspace.id)
      |> lock("FOR UPDATE")
      |> Repo.all()

    workflow_ids =
      WorkflowRun
      |> where([run], run.workspace_id == ^workspace.id)
      |> select([run], run.id)
      |> Repo.all()

    cleanup = Deletion.cleanup_targets(listings, merge_session_ids)

    StorageCleanup.enqueue!(
      keys: cleanup.keys ++ Enum.map(attachments, & &1.storage_key),
      prefixes: cleanup.prefixes ++ ["attachments/#{workspace.id}/"]
    )

    redact_chat!(workspace.id)
    redact_workflows!(workspace.id, workflow_ids)

    {attachment_count, _} =
      Repo.delete_all(
        from attachment in Attachment, where: attachment.workspace_id == ^workspace.id
      )

    {collection_count, _} =
      Repo.delete_all(
        from collection in Collection, where: collection.workspace_id == ^workspace.id
      )

    {1, _} =
      Workspace
      |> where([stored], stored.id == ^workspace.id)
      |> Repo.update_all(
        set: [retention_status: "purged", content_purged_at: now, updated_at: now]
      )

    counts = %{
      collections: collection_count,
      listings: length(listings),
      attachments: attachment_count,
      image_keys: length(cleanup.keys),
      merge_sessions: length(merge_session_ids),
      workflow_runs_redacted: length(workflow_ids)
    }

    Audit.record!(%{
      workspace_id: workspace.id,
      action: "retention.content_purged",
      target_type: "workspace",
      target_id: workspace.id,
      before: %{
        "retentionStatus" => workspace.retention_status,
        "retentionExpiresAt" => workspace.retention_expires_at
      },
      after: %{"retentionStatus" => "purged", "contentPurgedAt" => now},
      metadata: stringify_keys(counts)
    })

    Map.put(counts, :status, :purged)
  end

  defp redact_chat!(workspace_id) do
    conversation_ids =
      Conversation
      |> where([conversation], conversation.workspace_id == ^workspace_id)
      |> select([conversation], conversation.id)
      |> Repo.all()

    if conversation_ids != [] do
      Message
      |> where([message], message.conversation_id in ^conversation_ids)
      |> update([message],
        set: [
          attachments: [],
          metadata:
            fragment(
              "CASE WHEN (?->'parser_input') IS NOT NULL THEN jsonb_set(? - 'pending' - 'last_listing_id', '{parser_input}', (?->'parser_input') - 'base64' - 'attachmentId', false) ELSE ? - 'pending' - 'last_listing_id' END",
              message.metadata,
              message.metadata,
              message.metadata,
              message.metadata
            )
        ]
      )
      |> Repo.update_all([])
    end

    Conversation
    |> where([conversation], conversation.workspace_id == ^workspace_id)
    |> update([conversation],
      set: [
        metadata:
          fragment(
            "CASE WHEN (?->'parser_input') IS NOT NULL THEN jsonb_set(? - 'pending' - 'last_listing_id', '{parser_input}', (?->'parser_input') - 'base64' - 'attachmentId', false) ELSE ? - 'pending' - 'last_listing_id' END",
            conversation.metadata,
            conversation.metadata,
            conversation.metadata,
            conversation.metadata
          )
      ]
    )
    |> Repo.update_all([])
  end

  defp redact_workflows!(workspace_id, workflow_ids) do
    if workflow_ids != [] do
      Ecto.Adapters.SQL.query!(
        Repo,
        """
        DELETE FROM ai_duplicate_candidates AS candidate
         USING ai_workflow_runs AS workflow
         WHERE candidate.workflow_run_id = workflow.id
           AND workflow.workspace_id = $1::uuid
        """,
        [Ecto.UUID.dump!(workspace_id)]
      )
    end

    WorkflowRun
    |> where([run], run.workspace_id == ^workspace_id)
    |> update([run],
      set: [
        input: fragment("? - 'base64' - 'attachmentId'", run.input),
        result: nil
      ]
    )
    |> Repo.update_all([])
  end

  defp stringify_keys(map),
    do: Map.new(map, fn {key, value} -> {Atom.to_string(key), value} end)
end
