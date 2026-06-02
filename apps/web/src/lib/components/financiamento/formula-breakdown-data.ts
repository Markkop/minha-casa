import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
  type CenarioCompleto
} from "$lib/financiamento/calculations";

function compact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return v.toFixed(0);
}

function pct(v: number): string {
  return `${(v * 100).toFixed(2)}\\%`;
}

export function buildFormulaSections(cenario: CenarioCompleto) {
  const {
    valorImovel,
    valorApartamento,
    estrategia,
    entrada,
    financiamento,
    taxaAnual,
    trMensal,
    taxaMensalEfetiva,
    tabelaPadrao,
    cenarioOtimizado,
    comprometimento,
    economiaJuros,
    rendaMensal
  } = cenario;

  const haircut = estrategia === "permuta" ? 0.15 : 0;

  const valorFinanciadoFormula =
    estrategia === "permuta"
      ? {
          latex: "V_f = I - (C - R) - A \\times (1 - h)",
          withValues: `V_f = ${compact(valorImovel)} - (${compact(cenario.financiamento.entradaDinheiro + cenario.entrada)} - ${compact(cenario.entrada - cenario.financiamento.entradaDinheiro + cenario.entrada)}) - ${compact(valorApartamento)} \\times (1 - ${(haircut * 100).toFixed(0)}\\%)`,
          result: formatCurrency(financiamento.valorFinanciado),
          steps: [
            {
              formula: `C - R = ${compact(cenario.financiamento.entradaDinheiro + entrada)} - ${compact(entrada - cenario.financiamento.entradaDinheiro)} = ${compact(entrada)}`,
              description: "Capital disponível menos reserva de emergência"
            },
            {
              formula: `A \\times (1-h) = ${compact(valorApartamento)} \\times 0.${((1 - haircut) * 100).toFixed(0)} = ${compact(financiamento.valorApartamentoUsado)}`,
              description: `Valor do apartamento com deságio de ${(haircut * 100).toFixed(0)}%`
            },
            {
              formula: `V_f = ${compact(valorImovel)} - ${compact(entrada)} - ${compact(financiamento.valorApartamentoUsado)} = ${compact(financiamento.valorFinanciado)}`,
              description: "Valor final a ser financiado"
            }
          ]
        }
      : {
          latex: "V_f = I - (C - R)",
          withValues: `V_f = ${compact(valorImovel)} - ${compact(entrada)}`,
          result: formatCurrency(financiamento.valorFinanciado),
          steps: [
            {
              formula: `C - R = ${compact(entrada + (cenario.financiamento.entradaDinheiro - entrada))} - ${compact(cenario.financiamento.entradaDinheiro - entrada)} = ${compact(entrada)}`,
              description: "Capital disponível menos reserva de emergência"
            },
            {
              formula: `V_f = ${compact(valorImovel)} - ${compact(entrada)} = ${compact(financiamento.valorFinanciado)}`,
              description: "Valor final a ser financiado"
            }
          ]
        };

  const taxaFormula = {
    latex: "i_{mensal} = \\frac{i_{anual}}{12} + TR_{mensal}",
    withValues: `i_{mensal} = \\frac{${pct(taxaAnual)}}{12} + ${pct(trMensal)}`,
    result: formatPercent(taxaMensalEfetiva),
    steps: [
      {
        formula: `\\frac{${pct(taxaAnual)}}{12} = ${pct(taxaAnual / 12)}`,
        description: "Taxa de juros mensal"
      },
      {
        formula: `${pct(taxaAnual / 12)} + ${pct(trMensal)} = ${pct(taxaMensalEfetiva)}`,
        description: "Taxa efetiva mensal (juros + TR)"
      }
    ]
  };

  const amortizacaoMensal = tabelaPadrao.amortizacaoMensal;
  const juros1 = financiamento.valorFinanciado * taxaMensalEfetiva;
  const seguros = 175;

  const parcelaSACFormula = {
    latex: "P_1 = A + (S_0 \\times i) + seg",
    withValues: `P_1 = ${compact(amortizacaoMensal)} + (${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)}) + ${seguros}`,
    result: formatCurrency(tabelaPadrao.primeiraParcelar),
    steps: [
      {
        formula: `A = \\frac{V_f}{n} = \\frac{${compact(financiamento.valorFinanciado)}}{360} = ${compact(amortizacaoMensal)}`,
        description: "Amortização mensal constante (SAC)"
      },
      {
        formula: `J_1 = S_0 \\times i = ${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)} = ${compact(juros1)}`,
        description: "Juros do primeiro mês"
      },
      {
        formula: `P_1 = ${compact(amortizacaoMensal)} + ${compact(juros1)} + ${seguros} = ${compact(tabelaPadrao.primeiraParcelar)}`,
        description: "Primeira parcela total"
      }
    ]
  };

  const comprometimentoFormula = {
    latex: "\\%_{renda} = \\frac{P_1}{Renda} \\times 100",
    withValues: `\\%_{renda} = \\frac{${compact(tabelaPadrao.primeiraParcelar)}}{${compact(rendaMensal)}} \\times 100`,
    result: comprometimento.percentualFormatado,
    steps: [
      {
        formula: `\\frac{${compact(tabelaPadrao.primeiraParcelar)}}{${compact(rendaMensal)}} = ${comprometimento.percentual.toFixed(4)}`,
        description: "Razão parcela/renda"
      },
      {
        formula: `${comprometimento.percentual.toFixed(4)} \\times 100 = ${comprometimento.percentualFormatado}`,
        description: comprometimento.dentroDoLimite
          ? "Dentro do limite de 30%"
          : "⚠️ Acima do limite de 30%"
      }
    ]
  };

  const economiaFormula = {
    latex: "E = J_{padrão} - J_{otimizado}",
    withValues: `E = ${compact(tabelaPadrao.totalJuros)} - ${compact(cenarioOtimizado.totalJuros)}`,
    result: formatCurrency(economiaJuros),
    steps: [
      {
        formula: `J_{padrão} = ${formatCurrencyCompact(tabelaPadrao.totalJuros)}`,
        description: "Total de juros sem amortização extra"
      },
      {
        formula: `J_{otimizado} = ${formatCurrencyCompact(cenarioOtimizado.totalJuros)}`,
        description: "Total de juros com amortização acelerada"
      },
      {
        formula: `E = ${formatCurrencyCompact(economiaJuros)}`,
        description: `Economia de ${formatPercent(economiaJuros / tabelaPadrao.totalJuros)} dos juros`
      }
    ]
  };

  return {
    valorFinanciadoFormula,
    taxaFormula,
    parcelaSACFormula,
    comprometimentoFormula,
    economiaFormula
  };
}
