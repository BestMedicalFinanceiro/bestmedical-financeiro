import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authPessoal, setPessoalToken, getPessoalToken, API_ENABLED } from "./lib/api";

export type EscopoPessoal = "nenhum" | "pessoal" | "reservado";

const ESCOPO_KEY = "bmf_pessoal_escopo";
function lerEscopoSalvo(): EscopoPessoal {
  try {
    const v = localStorage.getItem(ESCOPO_KEY);
    return v === "pessoal" || v === "reservado" ? v : "nenhum";
  } catch {
    return "nenhum";
  }
}
function salvarEscopo(e: EscopoPessoal) {
  try {
    if (e === "nenhum") localStorage.removeItem(ESCOPO_KEY);
    else localStorage.setItem(ESCOPO_KEY, e);
  } catch {
    /* localStorage indisponível */
  }
}

interface PessoalAuthCtx {
  escopo: EscopoPessoal;
  autenticado: boolean;
  carregando: boolean;
  // null enquanto não checou; depois, se a senha comum já foi cadastrada.
  configurado: boolean | null;
  // true quando, dentro da área Pessoal, o cadeado deve oferecer cadastrar
  // a senha secreta (ainda não existe) em vez do gatilho disfarçado.
  precisaConfigurarSecreta: boolean;
  cadastrar: (senha: string) => Promise<void>;
  entrar: (senha: string) => Promise<void>;
  cadastrarSecreta: (senha: string) => Promise<void>;
  // Nunca lança — retorna se destravou ou não. É o gatilho disfarçado de
  // "bug": quem usa isto não deve mostrar nenhuma mensagem de erro.
  tentarSecreta: (senha: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<PessoalAuthCtx | null>(null);

export function PessoalAuthProvider({ children }: { children: ReactNode }) {
  const [escopo, setEscopo] = useState<EscopoPessoal>(() =>
    getPessoalToken() ? lerEscopoSalvo() : "nenhum",
  );
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [precisaConfigurarSecreta, setPrecisaConfigurarSecreta] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!API_ENABLED || escopo !== "nenhum") return;
    let ativo = true;
    setCarregando(true);
    authPessoal
      .status()
      .then((r) => {
        if (ativo) setConfigurado(r.configurado);
      })
      .catch(() => {
        if (ativo) setConfigurado(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [escopo]);

  const aplicarSessao = (token: string, novoEscopo: EscopoPessoal) => {
    setPessoalToken(token);
    salvarEscopo(novoEscopo);
    setEscopo(novoEscopo);
  };

  const value: PessoalAuthCtx = {
    escopo,
    autenticado: escopo !== "nenhum",
    carregando,
    configurado,
    precisaConfigurarSecreta,
    cadastrar: async (senha) => {
      const r = await authPessoal.cadastrar(senha);
      aplicarSessao(r.accessToken, "pessoal");
      setPrecisaConfigurarSecreta(true);
    },
    entrar: async (senha) => {
      const r = await authPessoal.entrar(senha);
      aplicarSessao(r.accessToken, "pessoal");
      setPrecisaConfigurarSecreta(r.precisaConfigurarSecreta);
    },
    cadastrarSecreta: async (senha) => {
      const r = await authPessoal.cadastrarSecreta(senha);
      aplicarSessao(r.accessToken, "reservado");
      setPrecisaConfigurarSecreta(false);
    },
    tentarSecreta: async (senha) => {
      try {
        const r = await authPessoal.entrarSecreta(senha);
        aplicarSessao(r.accessToken, "reservado");
        return true;
      } catch {
        return false;
      }
    },
    logout: () => {
      setPessoalToken(null);
      salvarEscopo("nenhum");
      setEscopo("nenhum");
      setConfigurado(null);
      setPrecisaConfigurarSecreta(false);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePessoalAuth(): PessoalAuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePessoalAuth deve estar dentro de PessoalAuthProvider");
  return ctx;
}
