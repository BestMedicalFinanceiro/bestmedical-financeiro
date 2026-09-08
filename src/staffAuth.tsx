import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authStaff, setStaffToken, getStaffToken, API_ENABLED, type StaffUser } from "./lib/api";

interface StaffAuthCtx {
  user: StaffUser | null;
  autenticado: boolean;
  carregando: boolean;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<StaffAuthCtx | null>(null);

// Login de usuário da Best (mesmo login do app principal) — usado pelas
// abas Best Medical e Padu Studios.
export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [carregando, setCarregando] = useState<boolean>(API_ENABLED && !!getStaffToken());

  useEffect(() => {
    if (!API_ENABLED) return;
    const token = getStaffToken();
    if (!token) {
      setCarregando(false);
      return;
    }
    let ativo = true;
    authStaff
      .me()
      .then((u) => {
        if (ativo) setUser(u);
      })
      .catch(() => {
        setStaffToken(null);
        if (ativo) setUser(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const value: StaffAuthCtx = {
    user,
    autenticado: !!user,
    carregando,
    login: async (usuario, senha) => {
      const r = await authStaff.login(usuario, senha);
      setStaffToken(r.accessToken);
      setUser(r.user);
    },
    logout: () => {
      setStaffToken(null);
      setUser(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaffAuth(): StaffAuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStaffAuth deve estar dentro de StaffAuthProvider");
  return ctx;
}
