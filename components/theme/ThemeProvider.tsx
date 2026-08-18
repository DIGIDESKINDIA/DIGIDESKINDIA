"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppTheme =
  "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (
    theme: AppTheme
  ) => void;
  toggleTheme: () => void;
};

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY =
  "digidesk-theme";

const ThemeContext =
  createContext<
    ThemeContextValue | null
  >(null);

function applyTheme(
  theme: AppTheme
): void {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document.documentElement.dataset.theme =
    theme;

  document.documentElement.style.colorScheme =
    theme;
}

export default function ThemeProvider({
  children,
}: Props) {
  /*
   * Server and first client render
   * are intentionally identical.
   */
  const [theme, setTheme] =
    useState<AppTheme>("dark");

  /*
   * Read saved/user preference only
   * after hydration.
   */
  useEffect(() => {
    let nextTheme: AppTheme =
      "dark";

    try {
      const saved =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (
        saved === "light" ||
        saved === "dark"
      ) {
        nextTheme = saved;
      } else {
        nextTheme =
          window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches
            ? "dark"
            : "light";
      }
    } catch {
      nextTheme = "dark";
    }

    // Intentionally apply the persisted/OS theme only after hydration to
    // keep the server and first client render identical (avoids hydration
    // mismatches). This is the React-blessed escape hatch for theme providers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        theme
      );
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleChange =
      (event: MediaQueryListEvent) => {
        try {
          const saved =
            window.localStorage.getItem(
              STORAGE_KEY
            );

          if (
            saved === "light" ||
            saved === "dark"
          ) {
            return;
          }
        } catch {
          // Ignore storage errors.
        }

        setTheme(
          event.matches
            ? "dark"
            : "light"
        );
      };

    mediaQuery.addEventListener(
      "change",
      handleChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  const value =
    useMemo<ThemeContextValue>(
      () => ({
        theme,

        setTheme,

        toggleTheme: () => {
          setTheme(
            current =>
              current ===
              "dark"
                ? "light"
                : "dark"
          );
        },
      }),
      [theme]
    );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );

  if (!context) {
    throw new Error(
      "useTheme must be used within ThemeProvider."
    );
  }

  return context;
}