import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';
import { Navbar } from '../components/Navbar';
import { FhevmErrorBanner } from '../components/FhevmErrorBanner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CipherPoll - Privacy-First On-Chain Surveys",
  description: "Create and participate in encrypted surveys powered by FHEVM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <FhevmErrorBanner />
          <main className="min-h-screen pt-20">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
