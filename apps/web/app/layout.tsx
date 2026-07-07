import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeliServiX OS | Helicopter Operations System",
  description:
    "Bilingual helicopter operations system for fleet, campaign, maintenance, inventory, purchasing, technical records, and compliance workflows.",
  icons: {
    icon: "/favicon.png"
  }
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
