defmodule MinhaCasaAi.PortalSearches.ShortListing do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "short_listings" do
    field :portal, :string
    field :source_url, :string
    field :title, :string
    field :bairro, :string
    field :cidade, :string
    field :uf, :string
    field :tipo_imovel, :string
    field :quartos, :integer
    field :banheiros, :integer
    field :vagas, :integer
    field :suites, :integer
    field :area_total, :float
    field :area_privada, :float
    field :preco, :float
    field :preco_condominio, :float
    field :preco_m2, :float
    field :amenidades, {:array, :string}, default: []
    field :thumbnail_url, :string
    field :posted_at, :utc_datetime_usec
    field :raw_card, :map, default: %{}
    field :first_seen_at, :utc_datetime_usec
    field :last_seen_at, :utc_datetime_usec
    field :last_extracted_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(listing, attrs) do
    listing
    |> cast(attrs, [
      :portal,
      :source_url,
      :title,
      :bairro,
      :cidade,
      :uf,
      :tipo_imovel,
      :quartos,
      :banheiros,
      :vagas,
      :suites,
      :area_total,
      :area_privada,
      :preco,
      :preco_condominio,
      :preco_m2,
      :amenidades,
      :thumbnail_url,
      :posted_at,
      :raw_card,
      :first_seen_at,
      :last_seen_at,
      :last_extracted_at,
      :expires_at
    ])
    |> validate_required([:portal, :source_url])
    |> unique_constraint([:portal, :source_url])
  end
end
