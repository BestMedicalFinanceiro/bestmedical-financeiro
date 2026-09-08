// ===== Cliente HTTP — Best Medical Financeiro =====
// Fala com o MESMO backend do app principal (app.bestmedical.com.br), só
// que a partir de outro domínio (financeiro.bestmedical.com.br). Dois
// sistemas de autenticação, independentes e sem relação entre si:
// - "staff": o login de usuário da Best (JWT), usado por Best e Padu Studios.
// - "pessoal": a senha própria da área Pessoal (ver financeiro-pessoal-auth
//   no backend), usada por Pessoal e pela área reservada.
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

// ===== Token do staff (login de usuário da Best) — Best + Padu Studios =====
const STAFF_TOKEN_KEY = "bmf_staff_token";
let staffToken: string | null = safeGet(STAFF_TOKEN_KEY);
export const setStaffToken = (t: string | null) => {
  staffToken = t;
  safeSet(STAFF_TOKEN_KEY, t);
};
export const getStaffToken = () => staffToken;

// ===== Token da área Pessoal (senha própria) — Pessoal + área reservada ====
const PESSOAL_TOKEN_KEY = "bmf_pessoal_token";
let pessoalToken: string | null = safeGet(PESSOAL_TOKEN_KEY);
export const setPessoalToken = (t: string | null) => {
  pessoalToken = t;
  safeSet(PESSOAL_TOKEN_KEY, t);
};
export const getPessoalToken = () => pessoalToken;

async function req<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ===================== Auth — staff (Best Medical) =====================

export interface StaffUser {
  id: string;
  nome: string;
  usuario: string;
  email: string;
  perfil: string;
}

export const authStaff = {
  login: (usuario: string, senha: string) =>
    req<{ accessToken: string; user: StaffUser }>("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ usuario, senha }),
    }),
  me: () => req<StaffUser>("/auth/me", getStaffToken()),
};

// ===================== Auth — área Pessoal (senha própria) ===============

export const authPessoal = {
  status: () => req<{ configurado: boolean }>("/financeiro/pessoal/status", null),

  cadastrar: (senha: string) =>
    req<{ accessToken: string }>("/financeiro/pessoal/cadastrar", null, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),

  entrar: (senha: string) =>
    req<{ accessToken: string; precisaConfigurarSecreta: boolean }>(
      "/financeiro/pessoal/entrar",
      null,
      { method: "POST", body: JSON.stringify({ senha }) },
    ),

  cadastrarSecreta: (senha: string) =>
    req<{ accessToken: string }>(
      "/financeiro/pessoal/cadastrar-secreta",
      getPessoalToken(),
      { method: "POST", body: JSON.stringify({ senha }) },
    ),

  // O gatilho "disfarçado de bug". Lança se a senha não bater — quem chama
  // deve tratar o erro engolindo-o silenciosamente (ver componente Cadeado).
  entrarSecreta: (senha: string) =>
    req<{ accessToken: string }>(
      "/financeiro/pessoal/entrar-secreta",
      getPessoalToken(),
      { method: "POST", body: JSON.stringify({ senha }) },
    ),

  esqueciSenha: () =>
    req<{ ok: true }>("/financeiro/pessoal/esqueci-senha", null, { method: "POST" }),

  redefinirSenha: (token: string, novaSenha: string) =>
    req<{ ok: true }>("/financeiro/pessoal/redefinir-senha", null, {
      method: "POST",
      body: JSON.stringify({ token, novaSenha }),
    }),
};

// ===================== Tipos genéricos (mesma forma nos 4 contextos) =====

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

// Recebível: o campo "quem paga" chama-se "empresa" no backend da Best/Padu
// e "origem" no da Pessoal/Reservado — aqui, sempre "contraparte".
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
// Cada um dos 4 contextos financeiros (Best, Padu Studios, Pessoal, área
// reservada) expõe o MESMO conjunto de rotas no backend, só que sob
// prefixos e mecanismos de autenticação diferentes — esta fábrica gera o
// mesmo conjunto de funções para qualquer um deles.

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

export function criarClienteFinanceiro(basePath: string, token: () => string | null) {
  return {
    // ----- Despesas -----
    listarDespesas: (params?: ListaParams) =>
      req<Paginated<Despesa>>(`${basePath}/despesas${query(params)}`, token()),
    criarDespesa: (dto: Record<string, unknown>) =>
      req<Despesa>(`${basePath}/despesas`, token(), {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    atualizarDespesa: (id: string, dto: Record<string, unknown>) =>
      req<Despesa>(`${basePath}/despesas/${id}`, token(), {
        method: "PUT",
        body: JSON.stringify(dto),
      }),
    removerDespesa: (id: string) =>
      req<{ ok: boolean }>(`${basePath}/despesas/${id}`, token(), { method: "DELETE" }),
    listarBaixasDespesa: (id: string) =>
      req<Baixa[]>(`${basePath}/despesas/${id}/baixas`, token()),
    registrarBaixaDespesa: (id: string, dto: NovaBaixa) =>
      req<Despesa>(`${basePath}/despesas/${id}/baixas`, token(), {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    removerBaixaDespesa: (id: string, baixaId: string) =>
      req<Despesa>(`${basePath}/despesas/${id}/baixas/${baixaId}`, token(), {
        method: "DELETE",
      }),

    // ----- Recebíveis -----
    listarRecebiveis: (params?: ListaParams) =>
      req<Paginated<RecebivelBruto>>(`${basePath}/recebiveis${query(params)}`, token()).then(
        (r) => ({ ...r, data: r.data.map(normalizarRecebivel) }),
      ),
    criarRecebivel: (dto: Record<string, unknown>) =>
      req<RecebivelBruto>(`${basePath}/recebiveis`, token(), {
        method: "POST",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    atualizarRecebivel: (id: string, dto: Record<string, unknown>) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}`, token(), {
        method: "PUT",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    removerRecebivel: (id: string) =>
      req<{ ok: boolean }>(`${basePath}/recebiveis/${id}`, token(), { method: "DELETE" }),
    listarBaixasRecebivel: (id: string) =>
      req<Baixa[]>(`${basePath}/recebiveis/${id}/baixas`, token()),
    registrarBaixaRecebivel: (id: string, dto: NovaBaixa) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}/baixas`, token(), {
        method: "POST",
        body: JSON.stringify(dto),
      }).then(normalizarRecebivel),
    removerBaixaRecebivel: (id: string, baixaId: string) =>
      req<RecebivelBruto>(`${basePath}/recebiveis/${id}/baixas/${baixaId}`, token(), {
        method: "DELETE",
      }).then(normalizarRecebivel),

    // ----- Fluxo de Caixa + Dashboard -----
    fluxoCaixa: () => req<FluxoCaixaLancamento[]>(`${basePath}/fluxo-caixa`, token()),
    resumo: () => req<ResumoFinanceiro>(`${basePath}/resumo`, token()),
  };
}

export type ClienteFinanceiro = ReturnType<typeof criarClienteFinanceiro>;

// ===================== Os 4 clientes =====================

export const apiBest = criarClienteFinanceiro("/financeiro", getStaffToken);
export const apiPadu = criarClienteFinanceiro("/financeiro/padu", getStaffToken);
export const apiPessoal = criarClienteFinanceiro("/financeiro/pessoal", getPessoalToken);
export const apiReservado = criarClienteFinanceiro(
  "/financeiro/pessoal/reservado",
  getPessoalToken,
);
