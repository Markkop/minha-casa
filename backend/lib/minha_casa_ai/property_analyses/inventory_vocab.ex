defmodule MinhaCasaAi.PropertyAnalyses.InventoryVocab do
  @moduledoc """
  Controlled vocabulary for ambiente inventory (prompt context only).
  The normalizer does not enforce membership — the LLM is instructed to use these lists.
  """

  @estruturais [
    "piso",
    "parede",
    "teto",
    "forro",
    "laje",
    "rodapé",
    "soleira",
    "peitoril",
    "porta",
    "batente",
    "guarnição",
    "janela",
    "esquadria",
    "vidro",
    "revestimento",
    "revestimento de parede",
    "revestimento de piso",
    "revestimento de teto",
    "faixa de revestimento",
    "painel",
    "painel ripado",
    "nicho",
    "divisória",
    "bancada",
    "frontão",
    "escada",
    "degrau",
    "corrimão",
    "guarda-corpo",
    "deck",
    "cobertura"
  ]

  @instalacoes [
    "pia",
    "cuba",
    "tanque",
    "torneira",
    "misturador",
    "sifão",
    "registro",
    "chuveiro",
    "ducha",
    "ducha higiênica",
    "vaso sanitário",
    "caixa acoplada",
    "bidê",
    "mictório",
    "banheira",
    "ofurô",
    "box",
    "espelho",
    "gabinete",
    "armário",
    "prateleira",
    "cooktop",
    "fogão",
    "forno",
    "micro-ondas",
    "coifa",
    "depurador",
    "lava-louças",
    "geladeira",
    "máquina de lavar",
    "secadora",
    "varal",
    "churrasqueira",
    "piscina",
    "aquecedor",
    "boiler",
    "ar-condicionado",
    "ventilador de teto",
    "exaustor",
    "luminária",
    "plafon",
    "spot",
    "pendente",
    "arandela",
    "interruptor",
    "tomada",
    "quadro elétrico",
    "interfone",
    "campainha",
    "câmera",
    "sensor",
    "ralo",
    "grelha",
    "tubulação",
    "medidor"
  ]

  @moveis [
    "sofá",
    "poltrona",
    "cadeira",
    "banqueta",
    "mesa",
    "mesa de jantar",
    "mesa de centro",
    "mesa lateral",
    "escrivaninha",
    "cama",
    "beliche",
    "cabeceira",
    "criado-mudo",
    "cômoda",
    "guarda-roupa",
    "estante",
    "rack",
    "aparador",
    "buffet",
    "sapateira",
    "banco",
    "bancada móvel",
    "carrinho",
    "tapete",
    "cortina",
    "persiana",
    "almofada",
    "colchão",
    "roupa de cama",
    "toalha",
    "quadro",
    "vaso",
    "planta",
    "abajur",
    "luminária de piso",
    "luminária de mesa",
    "televisão",
    "eletrodoméstico",
    "lixeira",
    "cesto",
    "organizador",
    "brinquedo",
    "bicicleta",
    "escada portátil"
  ]

  @materiais [
    "cerâmica",
    "porcelanato",
    "azulejo",
    "pastilha",
    "ladrilho hidráulico",
    "cimento queimado",
    "cimento",
    "concreto",
    "concreto aparente",
    "granilite",
    "marmorite",
    "fulget",
    "granito",
    "mármore",
    "quartzito",
    "quartzo",
    "pedra sintética",
    "pedra natural",
    "ardósia",
    "basalto",
    "seixo",
    "madeira",
    "madeira maciça",
    "madeira ripada",
    "lambri de madeira",
    "taco de madeira",
    "assoalho de madeira",
    "laminado",
    "vinílico",
    "MDF",
    "MDP",
    "compensado",
    "fórmica",
    "melamina",
    "laca",
    "drywall",
    "gesso",
    "placa de gesso",
    "PVC",
    "forro mineral",
    "pintura",
    "textura",
    "grafiato",
    "reboco",
    "massa corrida",
    "papel de parede",
    "tecido",
    "couro",
    "carpete",
    "vidro",
    "vidro temperado",
    "vidro jateado",
    "vidro canelado",
    "vidro espelhado",
    "espelho",
    "alumínio",
    "ferro",
    "aço",
    "aço inox",
    "inox",
    "metal",
    "latão",
    "cobre",
    "bronze",
    "cromado",
    "telha cerâmica",
    "telha metálica",
    "telha de fibrocimento",
    "telha de concreto",
    "policarbonato",
    "acrílico",
    "fibra de vidro",
    "alvenaria",
    "tijolo",
    "tijolo aparente",
    "bloco de concreto",
    "cobogó cerâmico",
    "cobogó de cimento",
    "louça",
    "louça sanitária",
    "resina",
    "plástico",
    "polietileno",
    "poliestireno",
    "borracha",
    "silicone",
    "pedra portuguesa",
    "piso intertravado",
    "piso drenante",
    "grama",
    "grama sintética",
    "terra",
    "brita",
    "cascalho"
  ]

  @examples [
    "piso de porcelanato",
    "parede de azulejo",
    "teto de gesso",
    "porta de madeira",
    "bancada de granito",
    "pia de inox",
    "torneira cromada",
    "vaso sanitário de louça",
    "sofá de tecido",
    "guarda-roupa de MDF"
  ]

  def estruturais, do: @estruturais
  def instalacoes, do: @instalacoes
  def moveis, do: @moveis
  def materiais, do: @materiais

  def prompt_block do
    """
    Vocabulário controlado do inventário (use SOMENTE estas strings em `tipo` e `material`):

    Regras do inventário (obrigatório):
    - Cada item: {"tipo": "...", "material": "..." (opcional), "detalhe": "..." (opcional)}.
    - `tipo` deve vir da lista correspondente ao array (estrutura → estruturais; instalacoes → instalações; moveis → móveis).
    - `material`, quando presente, deve vir da lista de materiais.
    - NUNCA inclua cor, tom ou acabamento cromático em tipo, material ou detalhe
      (proibido: branco, preto, cinza, bege, marrom, azul, verde, amarelo, etc.).
    - `detalhe` é opcional, curto (≤ 4 palavras), só características construtivas
      (ex.: "americana", "60x60", "embutido"). Nunca cor.

    Estruturais (array estrutura):
    #{Enum.join(@estruturais, ", ")}

    Instalações (array instalacoes):
    #{Enum.join(@instalacoes, ", ")}

    Móveis (array moveis):
    #{Enum.join(@moveis, ", ")}

    Materiais (campo material):
    #{Enum.join(@materiais, ", ")}

    Exemplos válidos (tipo + material):
    #{Enum.join(@examples, "; ")}
    """
  end
end
