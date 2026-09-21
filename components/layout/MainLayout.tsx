"use client";

import { ReactNode } from "react";

import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import FloatingAI from "@/components/ai/FloatingAI";
import ManishAIProvider from "@/components/ai/ManishAIProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Props {
  children: ReactNode;
}

export default function MainLayout({
  children,
}: Props) {
  const { theme } = useTheme();

  return (
    <ManishAIProvider>
      <div className={theme === "dark" ? "dd-page-surface min-h-screen text-white" : "dd-page-surface min-h-screen text-slate-900"}>
        <Navbar />

        <main>{children}</main>

        <Footer />

        <FloatingAI />

        <WhatsAppButton />
      </div>
    </ManishAIProvider>
  );
}