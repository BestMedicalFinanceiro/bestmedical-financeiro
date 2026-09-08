// ===== Utilitários de formatação (pt-BR) =====

export const formatBRL = (valor: number): string =>
  (valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export const formatDataBR = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const hojeISO = (): string => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
};

// Máscara monetária BR — recebe string digitada, devolve número em reais
export const parseMoedaInput = (v: string): number => {
  const apenasDigitos = v.replace(/\D/g, "");
  if (!apenasDigitos) return 0;
  return parseInt(apenasDigitos, 10) / 100;
};

// Exibe número como texto de input monetário (sem símbolo R$, só 1.234,56)
export const moedaParaInput = (valor: number): string =>
  (valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
