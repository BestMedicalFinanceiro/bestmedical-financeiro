import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authFinanceiro,
  setToken,
  getToken,
  lerNivelSalvo,
  salvarNivel,
  API_ENABLED,
  type NivelFinanceiro,
} from "./lib/api";

const IDLE_LIMITE_MS = 2 * 60 * 1000; // 2 minutos de inatividade fecha a sessão

function safeGetBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function safeSetBool(key: string, v: boolean) {
  try {
    if (v) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* localStorage indisponível */
  }
}
const PESSOAL_CFG_KEY = "bmf_pessoal_cfg";
const SECRETA_CFG_KEY = "bmf_secreta_cfg";

interface FinanceiroAuthCtx {
  nivel: NivelFinanceiro;
  autenticado: boolean;
  carregando: boolean;
  entradaConfigurada: boolean | null;
  pessoalConfigurada: boolean;
  secretaConfigurada: boolean;
  cadastrarEntrada: (senha: string, pin: string) => Promise<void>;
  entrar: (senha: string) => Promise<void>;
  cadastrarPessoal: (senha: string) => Promise<void>;
  entrarPessoal: (senha: string) => Promise<void>;
  cadastrarSecreto: (senha: string) => Promise<void>;
  // Nunca lança — retorna se destravou ou não. É o gatilho disfarçado de
  // "bug": quem usa isto não deve mostrar nenhuma mensagem de erro.
  tentarSecreto: (senha: string) => Promise<boolean>;
  recuperar: (pin: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<FinanceiroAuthCtx | null>(null);

export function FinanceiroAuthProvider({ children }: { children: ReactNode }) {
  const [nivel, setNivel] = useState<NivelFinanceiro>(() =>
    getToken() ? lerNivelSalvo() : "nenhum",
  );
  const [entradaConfigurada, setEntradaConfigurada] = useState<boolean | null>(null);
  const [pessoalConfigurada, setPessoalConfigurada] = useState(() => safeGetBool(PESSOAL_CFG_KEY));
  const [secretaConfigurada, setSecretaConfigurada] = useState(() => safeGetBool(SECRETA_CFG_KEY));
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!API_ENABLED || nivel !== "nenhum") return;
    let ativo = true;
    setCarregando(true);
    authFinanceiro
      .status()
      .then((r) => {
        if (ativo) setEntradaConfigurada(r.entradaConfigurada);
      })
      .catch(() => {
        if (ativo) setEntradaConfigurada(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [nivel]);

  const aplicarSessao = (accessToken: string, novoNivel: NivelFinanceiro) => {
    setToken(accessToken);
    salvarNivel(novoNivel);
    setNivel(novoNivel);
  };

  const logout = () => {
    setToken(null);
    salvarNivel("nenhum");
    setNivel("nenhum");
    setEntradaConfigurada(null);
    setPessoalConfigurada(false);
    setSecretaConfigurada(false);
    safeSetBool(PESSOAL_CFG_KEY, false);
    safeSetBool(SECRETA_CFG_KEY, false);
  };

  // ===== Auto-lock por inatividade (2 minutos) =====
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  useEffect(() => {
    if (nivel === "nenhum") return;
    let timer: number;
    const reiniciar = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => logoutRef.current(), IDLE_LIMITE_MS);
    };
    const eventos = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    eventos.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }));
    reiniciar();
    return () => {
      window.clearTimeout(timer);
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciar));
    };
  }, [nivel]);

  const value: FinanceiroAuthCtx = {
    nivel,
    autenticado: nivel !== "nenhum",
    carregando,
    entradaConfigurada,
    pessoalConfigurada,
    secretaConfigurada,
    cadastrarEntrada: async (senha, pin) => {
      const r = await authFinanceiro.cadastrarEntrada("paulodick", senha, pin);
      aplicarSessao(r.accessToken, "entrada");
    },
    entrar: async (senha) => {
      const r = await authFinanceiro.entrar("paulodick", senha);
      aplicarSessao(r.accessToken, "entrada");
      setPessoalConfigurada(r.pessoalConfigurada);
      safeSetBool(PESSOAL_CFG_KEY, r.pessoalConfigurada);
    },
    cadastrarPessoal: async (senha) => {
      const r = await authFinanceiro.cadastrarPessoal(senha);
      aplicarSessao(r.accessToken, "pessoal");
      setPessoalConfigurada(true);
      safeSetBool(PESSOAL_CFG_KEY, true);
    },
    entrarPessoal: async (senha) => {
      const r = await authFinanceiro.entrarPessoal(senha);
      aplicarSessao(r.accessToken, "pessoal");
      setSecretaConfigurada(r.secretaConfigurada);
      safeSetBool(SECRETA_CFG_KEY, r.secretaConfigurada);
    },
    cadastrarSecreto: async (senha) => {
      const r = await authFinanceiro.cadastrarSecreto(senha);
      aplicarSessao(r.accessToken, "secreto");
      setSecretaConfigurada(true);
      safeSetBool(SECRETA_CFG_KEY, true);
    },
    tentarSecreto: async (senha) => {
      try {
        const r = await authFinanceiro.entrarSecreto(senha);
        aplicarSessao(r.accessToken, "secreto");
        return true;
      } catch {
        return false;
      }
    },
    recuperar: async (pin) => {
      await authFinanceiro.recuperar(pin);
      logout();
    },
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFinanceiroAuth(): FinanceiroAuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFinanceiroAuth deve estar dentro de FinanceiroAuthProvider");
  return ctx;
}
