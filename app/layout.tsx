// File: app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import { Toaster } from "react-hot-toast";

import ThemeProvider from "@/components/theme/ThemeProvider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://digideskindia.com"),

  title: {
    default: "DigiDesk India",
    template: "%s | DigiDesk India",
  },

  description:
    "DigiDesk India is a premium digital services platform for Government Services, PDF Tools, Image Tools, CSC support, and Manish AI.",

  applicationName: "DigiDesk India",

  keywords: [
    "Digital Desk India",
    "Government Services",
    "PDF Tools",
    "Image Tools",
    "AI Tools",
    "Passport Photo",
    "Background Remover",
    "PAN Card",
    "Aadhaar",
    "CSC",
    "Online Form",
    "Resume Builder",
    "PDF Merge",
    "PDF Compress",
    "OCR",
    "Document Generator",
  ],

  authors: [
    {
      name: "DigiDesk India",
    },
  ],

  creator: "DigiDesk India",

  publisher: "DigiDesk India",

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://digideskindia.com",
    siteName: "DigiDesk India",
    title: "DigiDesk India",
    description:
      "India's premium digital services platform for Government Services, PDF Tools, Image Tools and AI assistance.",
    images: [
      {
        url: "/images/logo.png",
        width: 200,
        height: 200,
        alt: "Digital Desk India",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "DigiDesk India",
    description:
      "Government Services • PDF Tools • Image Tools • Manish AI",
    images: ["/images/logo.png"],
  },

  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/images/logo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon.svg",
    apple: "/images/logo.png",
  },

  manifest: "/manifest.webmanifest",

  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

const themeInitScript = `(() => {
  try {
    const key = "digidesk-theme";
    const saved = localStorage.getItem(key);
    const theme = saved === "light" || saved === "dark"
      ? saved
      : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${manrope.className} ${sora.variable} theme-transition overflow-x-hidden antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>

        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={10}
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "16px",
              background: "#0f172a",
              color: "#ffffff",
            },
            success: {
              duration: 2500,
            },
            error: {
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  );
}