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
    tipoTaxaAnual,
    sistemaAmortizacao,
    estrategiaAmortizacao,
    seguros,
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

  const taxaBaseMensal =
    tipoTaxaAnual === "efetiva" ? (1 + taxaAnual) ** (1 / 12) - 1 : taxaAnual / 12;
  const taxaFormula = {
    latex:
      tipoTaxaAnual === "efetiva"
        ? "i_{mensal} = (1 + i_{anual})^{\\frac{1}{12}} - 1 + TR_{mensal}"
        : "i_{mensal} = \\frac{i_{anual}}{12} + TR_{mensal}",
    withValues:
      tipoTaxaAnual === "efetiva"
        ? `i_{mensal} = (1 + ${pct(taxaAnual)})^{\\frac{1}{12}} - 1 + ${pct(trMensal)}`
        : `i_{mensal} = \\frac{${pct(taxaAnual)}}{12} + ${pct(trMensal)}`,
    result: formatPercent(taxaMensalEfetiva),
    steps: [
      {
        formula:
          tipoTaxaAnual === "efetiva"
            ? `(1 + ${pct(taxaAnual)})^{\\frac{1}{12}} - 1 = ${pct(taxaBaseMensal)}`
            : `\\frac{${pct(taxaAnual)}}{12} = ${pct(taxaBaseMensal)}`,
        description:
          tipoTaxaAnual === "efetiva"
            ? "Conversão da taxa efetiva anual por juros compostos"
            : "Conversão da taxa nominal anual por divisão"
      },
      {
        formula: `${pct(taxaBaseMensal)} + ${pct(trMensal)} = ${pct(taxaMensalEfetiva)}`,
        description: "Taxa efetiva mensal (juros + TR)"
      }
    ]
  };

  const amortizacaoMensal = tabelaPadrao.amortizacaoMensal;
  const juros1 = financiamento.valorFinanciado * taxaMensalEfetiva;
  const seguroMensal = seguros ?? 0;
  const seguroLatex = seguroMensal > 0 ? " + seg" : "";
  const seguroValor = seguroMensal > 0 ? ` + ${compact(seguroMensal)}` : "";
  const prazoMeses = tabelaPadrao.prazoMeses;
  const priceFactor =
    taxaMensalEfetiva === 0
      ? 1 / prazoMeses
      : (taxaMensalEfetiva * (1 + taxaMensalEfetiva) ** prazoMeses) /
        ((1 + taxaMensalEfetiva) ** prazoMeses - 1);

  const parcelaFormula =
    sistemaAmortizacao === "price"
      ? {
          latex:
            taxaMensalEfetiva === 0
              ? `P = \\frac{S_0}{n}${seguroLatex}`
              : `P = S_0 \\times \\frac{i(1+i)^n}{(1+i)^n-1}${seguroLatex}`,
          withValues:
            taxaMensalEfetiva === 0
              ? `P = \\frac{${compact(financiamento.valorFinanciado)}}{${prazoMeses}}${seguroValor}`
              : `P = ${compact(financiamento.valorFinanciado)} \\times \\frac{${pct(taxaMensalEfetiva)}(1+${pct(taxaMensalEfetiva)})^{${prazoMeses}}}{(1+${pct(taxaMensalEfetiva)})^{${prazoMeses}}-1}${seguroValor}`,
          result: formatCurrency(tabelaPadrao.primeiraParcelar),
          steps: [
            {
              formula:
                taxaMensalEfetiva === 0
                  ? `f = \\frac{1}{${prazoMeses}} = ${priceFactor.toFixed(6)}`
                  : `f = \\frac{i(1+i)^n}{(1+i)^n-1} = ${priceFactor.toFixed(6)}`,
              description:
                taxaMensalEfetiva === 0
                  ? "Fator de divisão para taxa zero"
                  : "Fator de recuperação de capital da tabela PRICE"
            },
            {
              formula: `P = ${compact(financiamento.valorFinanciado)} \\times ${priceFactor.toFixed(6)}${seguroValor} = ${compact(tabelaPadrao.primeiraParcelar)}`,
              description: seguroMensal > 0 ? "Prestação fixa inicial, incluindo seguro" : "Prestação fixa inicial"
            },
            {
              formula: `A_1 = P - J_1${seguroMensal > 0 ? " - seg" : ""} = ${compact(amortizacaoMensal)}`,
              description: "Amortização contida na primeira prestação"
            }
          ]
        }
      : {
          latex: `P_1 = A + (S_0 \\times i)${seguroLatex}`,
          withValues: `P_1 = ${compact(amortizacaoMensal)} + (${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)})${seguroValor}`,
          result: formatCurrency(tabelaPadrao.primeiraParcelar),
          steps: [
            {
              formula: `A = \\frac{V_f}{n} = \\frac{${compact(financiamento.valorFinanciado)}}{${prazoMeses}} = ${compact(amortizacaoMensal)}`,
              description: "Amortização mensal constante (SAC)"
            },
            {
              formula: `J_1 = S_0 \\times i = ${compact(financiamento.valorFinanciado)} \\times ${pct(taxaMensalEfetiva)} = ${compact(juros1)}`,
              description: "Juros do primeiro mês"
            },
            {
              formula: `P_1 = ${compact(amortizacaoMensal)} + ${compact(juros1)}${seguroValor} = ${compact(tabelaPadrao.primeiraParcelar)}`,
              description: seguroMensal > 0 ? "Primeira prestação, incluindo seguro" : "Primeira prestação"
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
        description: `Total de juros ao ${estrategiaAmortizacao === "reduzir_prestacao" ? "reduzir prestação" : "reduzir prazo"}`
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
    parcelaFormula,
    comprometimentoFormula,
    economiaFormula
  };
}
