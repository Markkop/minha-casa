defmodule MinhaCasaAi.PortalSearches.FilterSet do
  @moduledoc false

  @transacoes ~w(venda aluguel)
  @tipos_imovel ~w(
    apartamento casa sobrado cobertura kitnet studio loft flat
    casa_condominio terreno sala_comercial galpao chacara sitio fazenda
  )
  @amenidades ~w(
    piscina churrasqueira academia sacada varanda_gourmet mobiliado portaria_24h
    elevador salao_de_festas playground quadra sauna seguranca_24h aceita_pets
    ar_condicionado armarios_cozinha armarios_quarto proximo_metro
  )
  @estagios ~w(pronto em_construcao na_planta lancamento)

  def transacoes, do: @transacoes
  def tipos_imovel, do: @tipos_imovel
  def amenidades, do: @amenidades
  def estagios, do: @estagios

  def default do
    %{
      "transacao" => "venda",
      "uf" => "sp",
      "cidade" => "sao-paulo",
      "bairros" => [],
      "tiposImovel" => ["apartamento"],
      "quartos" => [],
      "banheiros" => [],
      "vagas" => [],
      "suites" => [],
      "precoMin" => nil,
      "precoMax" => nil,
      "areaMin" => nil,
      "areaMax" => nil,
      "condominioMax" => nil,
      "amenidades" => [],
      "estagio" => []
    }
  end

  def parse(raw) when is_map(raw) do
    parsed =
      default()
      |> Map.merge(stringify_keys(raw))
      |> normalize()

    case validate(parsed) do
      :ok -> {:ok, parsed}
      {:error, reason} -> {:error, reason}
    end
  end

  def parse(_), do: {:error, :invalid_filter_set}

  defp normalize(map) do
    map
    |> put_string("transacao", &(&1 in @transacoes), "venda")
    |> put_string("uf", fn v -> is_binary(v) and String.length(v) == 2 end, "sp")
    |> update_in(["uf"], &String.downcase/1)
    |> put_string("cidade", &is_binary/1, "sao-paulo")
    |> update_in(["cidade"], &slugify/1)
    |> put_string_list("bairros")
    |> put_string_list("tiposImovel", @tipos_imovel)
    |> put_int_list("quartos")
    |> put_int_list("banheiros")
    |> put_int_list("vagas")
    |> put_int_list("suites")
    |> put_string_list("amenidades", @amenidades)
    |> put_string_list("estagio", @estagios)
    |> put_nullable_number("precoMin")
    |> put_nullable_number("precoMax")
    |> put_nullable_number("areaMin")
    |> put_nullable_number("areaMax")
    |> put_nullable_number("condominioMax")
    |> ensure_tipos()
  end

  defp validate(%{"transacao" => t}) when t in @transacoes, do: :ok
  defp validate(_), do: {:error, :invalid_transacao}

  defp ensure_tipos(%{"tiposImovel" => []} = map),
    do: Map.put(map, "tiposImovel", ["apartamento"])

  defp ensure_tipos(map), do: map

  defp put_string(map, key, valid?, default) do
    case Map.get(map, key) do
      v when is_binary(v) ->
        if valid?.(v), do: map, else: Map.put(map, key, default)

      _ ->
        Map.put(map, key, default)
    end
  end

  defp put_string_list(map, key, allowed \\ nil) do
    values =
      map
      |> Map.get(key, [])
      |> List.wrap()
      |> Enum.filter(&is_binary/1)
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == ""))
      |> Enum.map(&slugify/1)

    values =
      if allowed do
        Enum.filter(values, &(&1 in allowed))
      else
        values
      end

    Map.put(map, key, values)
  end

  defp put_int_list(map, key) do
    values =
      map
      |> Map.get(key, [])
      |> List.wrap()
      |> Enum.map(&to_int/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.filter(&(&1 >= 0 and &1 <= 5))

    Map.put(map, key, values)
  end

  defp put_nullable_number(map, key) do
    Map.put(map, key, to_float(Map.get(map, key)))
  end

  defp stringify_keys(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp slugify(value) when is_binary(value) do
    value
    |> String.downcase()
    |> String.trim()
    |> String.normalize(:nfd)
    |> String.replace(~r/[^a-z0-9\s-]/u, "")
    |> String.replace(~r/\s+/, "-")
    |> String.replace(~r/-+/, "-")
  end

  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_float(n), do: trunc(n)

  defp to_int(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp to_int(_), do: nil

  defp to_float(nil), do: nil
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_float(_), do: nil
end
