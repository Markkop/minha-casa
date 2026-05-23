defmodule MinhaCasaAi.Integrations.PdfText do
  @min_text_length 50

  def extract(base64) when is_binary(base64) do
    with {:ok, bytes} <- decode(base64),
         {:ok, text} <- pdftotext(bytes),
         :ok <- validate_length(text) do
      {:ok, text}
    end
  end

  defp decode(base64) do
    base64
    |> String.replace(~r/^data:[^;]+;base64,/, "")
    |> String.trim()
    |> Base.decode64()
    |> case do
      {:ok, bytes} when byte_size(bytes) > 0 -> {:ok, bytes}
      {:ok, _} -> {:error, :empty_file}
      :error -> {:error, :invalid_base64}
    end
  end

  defp pdftotext(bytes) do
    path = Path.join(System.tmp_dir!(), "minha-casa-#{System.unique_integer([:positive])}.pdf")
    File.write!(path, bytes)

    try do
      case System.cmd("pdftotext", [path, "-"], stderr_to_stdout: true) do
        {text, 0} -> {:ok, String.trim(text)}
        {_output, _status} -> {:error, :pdf_extract_failed}
      end
    rescue
      ErlangError -> {:error, :pdf_tool_unavailable}
    after
      File.rm(path)
    end
  end

  defp validate_length(text) do
    if String.length(text) >= @min_text_length do
      :ok
    else
      {:error, :pdf_text_too_short}
    end
  end
end
