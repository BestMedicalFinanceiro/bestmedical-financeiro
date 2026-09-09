// ===== Cliente HTTP — Best Medical Financeiro =====
// Fala com o MESMO backend do app principal (app.bestmedical.com.br), só
// que a partir de outro domínio (financeiro.bestmedical.com.br). Login
// próprio, em cascata de 3 níveis (entrada -> pessoal -> secreto) — nada a
// ver com o login de usuário da Best, embora por baixo dos panos gere o
// mesmo tipo de token (por isso um único token/sessão cobre tanto o
// Financeiro Best (espelhado) quanto Pessoal/Secreto).
const API_PADRAO_PROD = "https://bestmedical-api.onrender.com/api/v1";

const urlConfigurada = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const urlResolvida =
  urlConfigurada && urlConfigurada.length > 0
    ? urlConfigurada
    : import.meta.env.PROD
      ? API_PADRAO_PROD
      : undefined;

const BASE = urlResolvida?.replace(/\/$/, "");
export const API_ENABLED = !!BASE;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, v: string | null) {
  try {
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  } catch {
    /* localStorage indisponível: mantém apenas em memória */
  }
}

// ===== Sessão única (token + nível) =====
export type NivelFinanceiro = "nenhum" | "entrada" | "pessoal" | "secreto";

const TOKEN_KEY = "bmf_token";
let token: string | null = safeGet(TOKEN_KEY);
export const setToken = (t: string | null) => {
  token = t;
  safeSet(TOKEN_KEY, t);
};
export const getToken = () => token;

const NIVEL_KEY = "bmf_nivel";
export function lerNivelSalvo(): NivelFinanceiro {
  const v = safeGet(NIVEL_KEY);
  return v === "entrada" || v === "pessoal" || v === "secreto" ? v : "nenhum";
}
export function salvarNivel(n: NivelFinanceiro) {
  if (n === "nenhum") safeSet(NIVEL_KEY, null);
  else safeSet(NIVEL_KEY, n);
}

async function req<T>(
  path: string,
  usarToken: boolean,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(usarToken && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ? String(body.message) : msg;
    } catch {
      /* ignora corpo não-JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ===================== Auth — cascata de 3 níveis =====================

export const authFinanceiro = {
  status: () => req<{ entradaConfigurada: boolean }>("/financeiro/status", false),

  cadastrarEntrada: (usuario: string, senha: string, pin: string) =>
    req<{ accessToken: string }>("/financeiro/cadastrar-entrada", false, {
      method: "POST",
      body: JSON.stringify({ usuario, senha, pin }),
    }),

  entrar: (usuario: string, senha: string) =>
    req<{ accessToken: string; pessoalConfigurada: boolean }>("/financeiro/entrar", false, {
      method: "POST",
      body: JSON.stringify({ usuario, senha }),
    }),

  cadastrarPessoal: (senha: string) =>
    req<{ accessToken: string }>("/financeiro/pessoal/cadastrar", true, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),

  entrarPessoal: (senha: string) =>
    req<{ accessToken: string; secretaConfigurada: boolean }>(
      "/financeiro/pessoal/entrar",
      true,
      { method: "POST", body: JSON.stringify({ senha }) },
    ),

  cadastrarSecreto: (senha: string) =>
    req<{ accessToken: string }>("/financeiro/pessoal/reservado/cadastrar", true, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),

  // O gatilho "disfarçado de bug". Lança se a senha não bater — quem chama
  // deve tratar o erro engolindo-o silenciosamente (ver componente Cadeado).
  entrarSecreto: (senha: string) =>
    req<{ accessToken: string }>("/financeiro/pessoal/reservado/entrar", true, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),

  // PIN único de 6 dígitos — reseta os 3 níveis de senha (não os dados).
  recuperar: (pin: string) =>
    req<{ ok: true }>("/financeiro/recuperar", false, {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
};

// ===================== Tipos genéricos (mesma forma em cada contexto) ====

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Boleto",
  "Transferência",
  "Cartão",
  "Dinheiro",
  "Outro",
] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export interface Baixa {
  id: string;
  data: string;
  valor: number;
  formaPagamento: string;
  observacao: string | null;
}

export interface NovaBaixa {
  data: string;
  valor: number;
  formaPagamento: string;
  observacao?: string;
}

export interface Despesa {
  id: string;
  data: string;
  pessoa?: string; // só no contexto Pessoal
  fornecedor: string;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  valorPago: number;
  saldoDevedor: number;
  pago: boolean;
  dataPagamento: string | null;
  observacoes: string | null;
  prioridade: string | null;
}

// Recebível: o campo "quem paga" chama-se "empresa" no backend da Best e
// "origem" no da Pessoal/Reservado — aqui, sempre "contraparte".
export interface Recebivel {
  id: string;
  data: string;
  pessoa?: string; // só no contexto Pessoal
  contraparte: string;
  descricao: string | null;
  valor: number;
  valorPago: number;
  saldoDevedor: number;
  pago: boolean;
  dataPagamento: string | null;
  condicaoPagamento: string | null;
  observacoes: string | null;
}

export interface FluxoCaixaLancamento {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  origem: string;
  descricao: string;
  categoria: string;
  valor: number;
  previsto?: boolean;
}

export interface ResumoFinanceiro {
  kpis: {
    receitaRecebida: number;
    receitaAberta: number;
    despesaTotal: number;
    despesaPaga: number;
    despesaPendente: number;
    resultado: number;
  };
  fluxo: { mes: string; entrada: number; saida: number; saldo: number }[];
  saldoAcumulado: { mes: string; saldo: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
  contasAPagar: { total: number; aPagar: number; atrasado: number };
  contasAReceber: { total: number; aReceber: number; atrasado: number };
  agingRecebiveis?: {
    emDia: number;
    ate15Dias: number;
    ate30Dias: number;
    mais30Dias: number;
  };
  atividadeRecente: {
    tipo: "entrada" | "saida";
    nome: string;
    valor: number;
    data: string;
    formaPagamento: string;
  }[];
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Forma bruta de Recebível como o backend devolve (empresa OU origem).
interface RecebivelBruto {
  id: string;
  data: string;
  pessoa?: string;
  empresa?: string;
  origem?: string;
  descricao: string | null;
  valor: number;
  valorPago: number;
  saldoDevedor: number;
  pago: boolean;
  dataPagamento: string | null;
  condicaoPagamento: string | null;
  observacoes: string | null;
}

function normalizarRecebivel(r: RecebivelBruto): Recebivel {
  return { ...r, contraparte: r.empresa ?? r.origem ?? "" };
}

// ===================== Fábrica de cliente por contexto ===================
// Best (espelhado), Pessoal e Secreto expõem o MESMO conjunto de rotas no
// backend, sob prefixos diferentes — esta fábrica gera o mesmo conjunto de
// funções pra qualquer um dos três. Todos usam a MESMA sessão (token único).

interface ListaParams {
  busca?: string;
  page?: number;
  pageSize?: number;
}

function query(params?: ListaParams): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  if (params.busca) sp.set("busca", params.busca);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("pageSize", String(params.pageSize));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function criarClienteFinanceiro(basePath: string) {
  return {
    // ----- Despesas -----
    listarDespesas: (params?: ListaParams) =>
      req<Paginated<Despesa>>(`${basePath}/despesas${query(params)}`, true),
    criarDespesa: (dto: Record<string, unknown>) =>
      req<Despesa>(`${basePath}/despesas`, true, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    atualizarDespesa: (id: string, dto: Record<string, unknown>) =>
      req<Despesa>(`${basePath}/despesas/${id}`, true, {
        method: "PUT",
        body: JSON.stringify(dto),
      }),
    removerDespesa: (id: string) =>
      req<{ ok: boolean }>(`${basePath}/despesas/${id}`, true, { method: "DELETE" }),
    listarBaixasDespesa: (id: string) =>
      req<Baixa[]>(`${basePath}/despesas/${id}/baixas`, true),
    registrarBaixaDespesa: (id: string, dto: NovaBaixa) =>
      req<Despesa>(`${basePath}/despesas/${id}/baixas`, true, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    removerBaixaDespesa: (id: string, baixaId: string) =>
      req<Despesa>(`${basePath}/despesas/${id}/baixas/${baixaId}`, true, {
        method: "DELETE",
      }),

    // ----- Recebíveis -----
    listarRecebiveis: (params?: ListaParams) =>
      req<Paginated<RecebivelBruto>>(`${basePath}/recebiveis${query(params)}`, true).then(
        (r) => ({ ...r, data: r.data.map(normalizarRecebivel) }),
      ),
    criarRecebivel: (dto: Record<string, unknown>) =>
      req<RecebivelBruto>(`${basePath}/recebiveis`, true, {
        method: "POST",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    atualizarRecebivel: (id: string, dto: Record<string, unknown>) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}`, true, {
        method: "PUT",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    removerRecebivel: (id: string) =>
      req<{ ok: boolean }>(`${basePath}/recebiveis/${id}`, true, { method: "DELETE" }),
    listarBaixasRecebivel: (id: string) =>
      req<Baixa[]>(`${basePath}/recebiveis/${id}/baixas`, true),
    registrarBaixaRecebivel: (id: string, dto: NovaBaixa) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}/baixas`, true, {
        method: "POST",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    removerBaixaRecebivel: (id: string, baixaId: string) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}/baixas/${baixaId}`, true, {
        method: "DELETE",
      }).then(normalizarRecebivel),

    // ----- Fluxo de Caixa + Dashboard -----
    fluxoCaixa: () => req<FluxoCaixaLancamento[]>(`${basePath}/fluxo-caixa`, true),
    resumo: () => req<ResumoFinanceiro>(`${basePath}/resumo`, true),
  };
}

export type ClienteFinanceiro = ReturnType<typeof criarClienteFinanceiro>;

// ===================== Os 3 clientes =====================

export const apiBest = criarClienteFinanceiro("/financeiro");
export const apiPessoal = criarClienteFinanceiro("/financeiro/pessoal");
export const apiReservado = criarClienteFinanceiro("/financeiro/pessoal/reservado");
