defmodule MinhaCasaAi.Workers.ListingImageIngestionWorker do
  use Oban.Worker,
    queue: :images,
    max_attempts: 3,
    unique: [period: 30, fields: [:args, :worker]]

  alias MinhaCasaAi.ListingImages.Ingest
  alias MinhaCasaAi.Listings

  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "listing_id" => listing_id,
          "collection_id" => collection_id
        }
      }) do
    Listings.update_listing(collection_id, listing_id, %{
      "imageIngestionStatus" => "processing",
      "imageIngestionError" => nil
    })

    case Ingest.run(listing_id, collection_id) do
      :ok -> :ok
      {:error, _} = error -> error
    end
  end
end
