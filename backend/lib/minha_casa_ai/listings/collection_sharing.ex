defmodule MinhaCasaAi.Listings.CollectionSharing do
  @moduledoc "Hashed share links, one-time collaboration invites and persistent grants."

  import Ecto.Query

  alias MinhaCasaAi.Entitlements

  alias MinhaCasaAi.Listings.{
    Collection,
    CollectionAccessGrant,
    CollectionCollaborationInvite,
    CollectionPolicy,
    CollectionShareLink
  }

  alias MinhaCasaAi.Repo

  @token_bytes 32
  @invite_ttl_seconds 7 * 24 * 60 * 60

  def create_link(collection_id, actor_user_id, attrs \\ %{}) do
    with {:ok, %Collection{} = collection, _} <-
           CollectionPolicy.authorize(actor_user_id, collection_id, :manage),
         {:ok, entitlement} <- Entitlements.for_workspace_id(collection.workspace_id),
         true <- Entitlements.can_share?(entitlement, "viewer") do
      token = token()

      %CollectionShareLink{}
      |> CollectionShareLink.changeset(%{
        collection_id: collection.id,
        token_hash: hash(token),
        created_by_user_id: actor_user_id,
        expires_at: parse_expiration(attrs["expiresAt"] || attrs[:expires_at])
      })
      |> Repo.insert()
      |> case do
        {:ok, link} ->
          collection
          |> Collection.changeset(%{is_public: true, share_token: nil})
          |> Repo.update!()

          {:ok, link, token}

        error ->
          error
      end
    else
      false -> {:error, :sharing_not_allowed}
      error -> error
    end
  end

  def create_invite(collection_id, actor_user_id, attrs \\ %{}) do
    role = attrs["role"] || attrs[:role] || "editor"

    with true <- role in ["viewer", "editor"],
         {:ok, %Collection{} = collection, _} <-
           CollectionPolicy.authorize(actor_user_id, collection_id, :manage),
         {:ok, entitlement} <- Entitlements.for_workspace_id(collection.workspace_id),
         true <- Entitlements.can_share?(entitlement, role) do
      token = token()
      now = DateTime.utc_now(:second)

      %CollectionCollaborationInvite{}
      |> CollectionCollaborationInvite.changeset(%{
        collection_id: collection.id,
        token_hash: hash(token),
        role: role,
        invited_email: normalize_email(attrs["email"] || attrs[:email]),
        created_by_user_id: actor_user_id,
        status: "pending",
        expires_at: DateTime.add(now, @invite_ttl_seconds, :second)
      })
      |> Repo.insert()
      |> case do
        {:ok, invite} -> {:ok, invite, token}
        error -> error
      end
    else
      false -> {:error, :sharing_not_allowed}
      error -> error
    end
  end

  def resolve_link(raw_token) do
    now = DateTime.utc_now(:second)

    with %CollectionShareLink{} = link <-
           Repo.get_by(CollectionShareLink, token_hash: hash(raw_token)),
         true <-
           is_nil(link.revoked_at) and
             (is_nil(link.expires_at) or DateTime.compare(link.expires_at, now) == :gt),
         %Collection{} = collection <- Repo.get(Collection, link.collection_id),
         {:ok, entitlement} <- Entitlements.for_workspace_id(collection.workspace_id),
         true <- entitlement.workspace_status == "active" do
      link
      |> CollectionShareLink.changeset(%{last_accessed_at: now})
      |> Repo.update()

      {:ok, collection, link}
    else
      _ -> {:error, :not_found}
    end
  end

  def claim_link(raw_token, user_id) do
    with {:ok, collection, _link} <- resolve_link(raw_token) do
      upsert_grant(collection.id, user_id, "viewer", nil)
    end
  end

  def accept_invite(raw_token, user_id, user_email \\ nil) do
    now = DateTime.utc_now(:second)

    Repo.transaction(fn ->
      invite =
        CollectionCollaborationInvite
        |> where([i], i.token_hash == ^hash(raw_token))
        |> lock("FOR UPDATE")
        |> Repo.one()

      cond do
        is_nil(invite) ->
          Repo.rollback(:not_found)

        invite.status != "pending" ->
          Repo.rollback(:unavailable)

        DateTime.compare(invite.expires_at, now) != :gt ->
          Repo.rollback(:expired)

        invite.invited_email && normalize_email(user_email) != invite.invited_email ->
          Repo.rollback(:email_mismatch)

        true ->
          grant =
            upsert_grant!(invite.collection_id, user_id, invite.role, invite.created_by_user_id)

          invite
          |> CollectionCollaborationInvite.changeset(%{
            status: "accepted",
            accepted_by_user_id: user_id,
            accepted_at: now
          })
          |> Repo.update!()

          grant
      end
    end)
  end

  def invite_preview(raw_token) do
    now = DateTime.utc_now(:second)

    with %CollectionCollaborationInvite{} = invite <-
           Repo.get_by(CollectionCollaborationInvite, token_hash: hash(raw_token)),
         true <- invite.status == "pending" and DateTime.compare(invite.expires_at, now) == :gt,
         %Collection{} = collection <- Repo.get(Collection, invite.collection_id),
         {:ok, entitlement} <- Entitlements.for_workspace_id(collection.workspace_id),
         true <- entitlement.workspace_status == "active" do
      {:ok,
       %{
         collection_name: collection.name,
         role: invite.role,
         expires_at: invite.expires_at,
         email_restricted: not is_nil(invite.invited_email)
       }}
    else
      _ -> {:error, :not_found}
    end
  end

  def revoke_links(collection_id, actor_user_id) do
    with {:ok, _collection, _} <-
           CollectionPolicy.authorize(actor_user_id, collection_id, :manage) do
      now = DateTime.utc_now(:second)

      from(l in CollectionShareLink,
        where: l.collection_id == ^collection_id and is_nil(l.revoked_at)
      )
      |> Repo.update_all(set: [revoked_at: now, updated_at: now])

      case Repo.get(Collection, collection_id) do
        %Collection{} = collection ->
          collection
          |> Collection.changeset(%{is_public: false, share_token: nil})
          |> Repo.update!()

        _ ->
          :ok
      end

      :ok
    end
  end

  def revoke_grant(collection_id, grant_id, actor_user_id) do
    with {:ok, _collection, _} <-
           CollectionPolicy.authorize(actor_user_id, collection_id, :manage),
         %CollectionAccessGrant{} = grant <-
           Repo.get_by(CollectionAccessGrant, id: grant_id, collection_id: collection_id) do
      now = DateTime.utc_now(:second)

      grant
      |> CollectionAccessGrant.changeset(%{
        status: "revoked",
        revoked_at: now,
        revoked_by_user_id: actor_user_id
      })
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  defp upsert_grant(collection_id, user_id, role, granted_by) do
    Repo.transaction(fn -> upsert_grant!(collection_id, user_id, role, granted_by) end)
  end

  defp upsert_grant!(collection_id, user_id, role, granted_by) do
    attrs = %{
      collection_id: collection_id,
      user_id: user_id,
      role: role,
      status: "active",
      granted_by_user_id: granted_by,
      revoked_at: nil,
      revoked_by_user_id: nil
    }

    case Repo.get_by(CollectionAccessGrant, collection_id: collection_id, user_id: user_id) do
      nil -> %CollectionAccessGrant{} |> CollectionAccessGrant.changeset(attrs) |> Repo.insert!()
      grant -> grant |> CollectionAccessGrant.changeset(attrs) |> Repo.update!()
    end
  end

  defp token, do: :crypto.strong_rand_bytes(@token_bytes) |> Base.url_encode64(padding: false)

  defp hash(value) when is_binary(value),
    do: :crypto.hash(:sha256, value) |> Base.encode16(case: :lower)

  defp hash(_), do: ""

  defp parse_expiration(nil), do: nil
  defp parse_expiration(""), do: nil

  defp parse_expiration(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> DateTime.truncate(dt, :second)
      _ -> nil
    end
  end

  defp parse_expiration(_), do: nil

  defp normalize_email(value) when is_binary(value),
    do: value |> String.trim() |> String.downcase() |> blank_to_nil()

  defp normalize_email(_), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value
end
