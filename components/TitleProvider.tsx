"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";

type Ctx = {
  activeProjectSlug: string | null;
  setActiveProjectSlug: (slug: string | null) => void;
};

const TitleContext = createContext<Ctx | null>(null);

export function useTitle(): Ctx {
  const ctx = useContext(TitleContext);
  if (!ctx) {
    return {
      activeProjectSlug: null,
      setActiveProjectSlug: () => {},
    };
  }
  return ctx;
}

export default function TitleProvider({ children }: { children: ReactNode }) {
  const [activeProjectSlug, setSlugInternal] = useState<string | null>(null);
  const setActiveProjectSlug = useCallback((slug: string | null) => {
    setSlugInternal(slug);
  }, []);
  const value = useMemo(
    () => ({ activeProjectSlug, setActiveProjectSlug }),
    [activeProjectSlug, setActiveProjectSlug]
  );
  return (
    <TitleContext.Provider value={value}>
      {children}
    </TitleContext.Provider>
  );
}
