'use client';

import Link from 'next/link';
import { WalletConnect } from './WalletConnect';

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-card border-b border-teal-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-3xl group-hover:scale-110 transition-transform">🔐</span>
            <span className="text-2xl font-bold text-gradient">
              CipherPoll
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link 
              href="/create"
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-teal-400 hover:bg-teal-400/10 transition-all duration-200"
            >
              Create
            </Link>
            <Link 
              href="/surveys"
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-teal-400 hover:bg-teal-400/10 transition-all duration-200"
            >
              Browse
            </Link>
            <Link 
              href="/my-surveys"
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-teal-400 hover:bg-teal-400/10 transition-all duration-200"
            >
              My Surveys
            </Link>
            <Link 
              href="/my-responses"
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-teal-400 hover:bg-teal-400/10 transition-all duration-200"
            >
              Responses
            </Link>
          </div>

          {/* Wallet Connect */}
          <WalletConnect />
        </div>
      </div>
    </nav>
  );
}

