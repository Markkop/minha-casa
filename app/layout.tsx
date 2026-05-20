import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { AddonsProvider } from "@/lib/use-addons";
import { SubscriptionProvider } from "@/lib/subscription-context";
import { SubscriptionCookieSync } from "@/components/subscription-cookie-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minha Casa",
  description: "Ferramentas inteligentes para ajudar na sua jornada de compra do imóvel dos sonhos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AddonsProvider>
          <SubscriptionProvider>
            <SubscriptionCookieSync />
            <NavBar />
            {children}
          </SubscriptionProvider>
        </AddonsProvider>
      </body>
    </html>
  );
}
