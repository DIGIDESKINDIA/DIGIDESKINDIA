"use client";

import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

type ManishAIContextValue = {
  enabled: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  setEnabled: (enabled: boolean) => void;
};

const ManishAIContext =
  createContext<ManishAIContextValue | null>(
    null
  );

export default function ManishAIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled =
    process.env.NEXT_PUBLIC_MANISH_AI_ENABLED ===
    "true";

  const [open, setOpenState] =
    useState(false);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      setOpenState(nextOpen);
    },
    []
  );

  const setEnabled = useCallback(
    (nextEnabled: boolean) => {
      if (!nextEnabled) {
        setOpenState(false);
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      enabled,
      open,
      setOpen,
      setEnabled,
    }),
    [enabled, open, setEnabled, setOpen]
  );

  return (
    <ManishAIContext.Provider value={value}>
      {children}
    </ManishAIContext.Provider>
  );
}

export function useManishAI() {
  const context =
    useContext(ManishAIContext);

  if (!context) {
    throw new Error(
      "useManishAI must be used inside ManishAIProvider."
    );
  }

  return context;
}
