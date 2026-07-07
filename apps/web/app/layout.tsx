import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeliServiX Commercial Intelligence Platform",
  description:
    "Enterprise commercial intelligence dashboard for helicopter operations serving tuna purse seine fleets."
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
