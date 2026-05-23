defmodule MinhaCasaAi.Repo.Migrations.CreateAiBackendTables do
  use Ecto.Migration

  def change do
    create table(:ai_workflow_runs, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:kind, :text, null: false)
      add(:status, :text, null: false, default: "received")
      add(:input, :map, null: false, default: %{})
      add(:result, :map)
      add(:error, :text)
      add(:user_id, :uuid)
      add(:org_id, :uuid)
      timestamps(type: :utc_datetime)
    end

    create(index(:ai_workflow_runs, [:user_id]))
    create(index(:ai_workflow_runs, [:org_id]))
    create(index(:ai_workflow_runs, [:status]))
    create(index(:ai_workflow_runs, [:kind, :inserted_at]))

    create table(:ai_attachments, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:user_id, :uuid)
      add(:org_id, :uuid)
      add(:storage_key, :text, null: false)
      add(:filename, :text)
      add(:content_type, :text, null: false)
      add(:byte_size, :integer, null: false)
      add(:source, :text, null: false)
      add(:metadata, :map, null: false, default: %{})
      timestamps(type: :utc_datetime)
    end

    create(unique_index(:ai_attachments, [:storage_key]))
    create(index(:ai_attachments, [:user_id]))
    create(index(:ai_attachments, [:org_id]))

    create table(:chat_conversations, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:user_id, :uuid)
      add(:org_id, :uuid)
      add(:channel, :text, null: false)
      add(:status, :text, null: false, default: "open")
      add(:metadata, :map, null: false, default: %{})
      timestamps(type: :utc_datetime)
    end

    create(index(:chat_conversations, [:user_id]))
    create(index(:chat_conversations, [:org_id]))
    create(index(:chat_conversations, [:channel, :status]))

    create table(:chat_messages, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:conversation_id, :uuid, null: false)
      add(:role, :text, null: false)
      add(:content, :text)
      add(:attachments, {:array, :map}, null: false, default: [])
      add(:metadata, :map, null: false, default: %{})
      timestamps(type: :utc_datetime)
    end

    create(index(:chat_messages, [:conversation_id, :inserted_at]))

    create table(:ai_duplicate_candidates, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:workflow_run_id, :uuid, null: false)
      add(:listing_id, :uuid)
      add(:score, :float, null: false)
      add(:reason, :text)
      add(:metadata, :map, null: false, default: %{})
      timestamps(type: :utc_datetime)
    end

    create(index(:ai_duplicate_candidates, [:workflow_run_id]))
    create(index(:ai_duplicate_candidates, [:listing_id]))

    create table(:mcp_tokens, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:user_id, :uuid, null: false)
      add(:org_id, :uuid)
      add(:name, :text, null: false)
      add(:token_hash, :text, null: false)
      add(:last_used_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)
      timestamps(type: :utc_datetime)
    end

    create(unique_index(:mcp_tokens, [:token_hash]))
    create(index(:mcp_tokens, [:user_id]))

    create table(:mcp_tool_calls, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:token_id, :uuid)
      add(:user_id, :uuid)
      add(:org_id, :uuid)
      add(:tool_name, :text, null: false)
      add(:arguments, :map, null: false, default: %{})
      add(:result, :map)
      add(:status, :text, null: false)
      add(:error, :text)
      timestamps(type: :utc_datetime)
    end

    create(index(:mcp_tool_calls, [:user_id, :inserted_at]))
    create(index(:mcp_tool_calls, [:tool_name]))

    create table(:whatsapp_events, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:provider_event_id, :text, null: false)
      add(:payload, :map, null: false)
      add(:status, :text, null: false, default: "received")
      add(:error, :text)
      timestamps(type: :utc_datetime)
    end

    create(unique_index(:whatsapp_events, [:provider_event_id]))
    create(index(:whatsapp_events, [:status]))
  end
end
