/** Contractual PRICE payment for a balance and remaining term, excluding insurance. */
export function calcularPrestacaoPrice(
  saldoDevedor: number,
  taxaMensalEfetiva: number,
  prazoMeses: number
): number {
  if (saldoDevedor <= 0 || prazoMeses <= 0) return 0;
  if (Math.abs(taxaMensalEfetiva) < 1e-12) return saldoDevedor / prazoMeses;

  const fator = Math.pow(1 + taxaMensalEfetiva, prazoMeses);
  return saldoDevedor * ((taxaMensalEfetiva * fator) / (fator - 1));
}
