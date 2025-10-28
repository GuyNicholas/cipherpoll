'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center space-y-12">
        {/* Logo & Title */}
        <div className="space-y-6">
          <div className="inline-block text-6xl sm:text-7xl mb-4 animate-pulse">🔐</div>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-6 text-gradient leading-tight">
            CipherPoll
          </h1>
          
          <p className="text-xl sm:text-2xl lg:text-3xl font-light" style={{ color: '#e5e7eb' }}>
            Privacy-First On-Chain Surveys with FHEVM
          </p>
        </div>

        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Create and participate in <span className="text-teal-400 font-semibold">fully encrypted surveys</span> on-chain.
          Powered by <span className="text-green-400 font-semibold">Fully Homomorphic Encryption (FHE)</span>, 
          your answers remain private while still being verifiable and tamper-proof.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 sm:gap-6 justify-center flex-wrap mt-8">
          <Link
            href="/create"
            className="group relative px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg text-white overflow-hidden glass-button inline-flex items-center justify-center gap-2"
          >
            ✨ Create Survey
          </Link>

          <Link
            href="/surveys"
            className="px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg text-white border-2 hover:scale-105 transition-all inline-flex items-center justify-center gap-2"
            style={{
              borderColor: 'rgba(20, 184, 166, 0.5)',
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#14B8A6';
              e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(20, 184, 166, 0.5)';
              e.currentTarget.style.backgroundColor = 'rgba(20, 184, 166, 0.1)';
            }}
          >
            📋 Browse Surveys
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-24 sm:mt-32 w-full max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="text-4xl sm:text-5xl mb-4">🔒</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: '#14B8A6' }}>
              Fully Encrypted
            </h3>
            <p className="leading-relaxed" style={{ color: '#d1d5db' }}>
              All responses are encrypted using FHE. No one can see individual answers,
              not even the survey creator.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="text-4xl sm:text-5xl mb-4">⛓️</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: '#10B981' }}>
              On-Chain Storage
            </h3>
            <p className="leading-relaxed" style={{ color: '#d1d5db' }}>
              Survey metadata and encrypted responses are stored directly on the blockchain.
              No third-party dependencies like IPFS.
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl hover:scale-105 transition-all duration-300">
            <div className="text-4xl sm:text-5xl mb-4">📊</div>
            <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: '#06B6D4' }}>
              Statistical Insights
            </h3>
            <p className="leading-relaxed" style={{ color: '#d1d5db' }}>
              Get aggregate statistics without revealing individual responses.
              FHE enables computation on encrypted data.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 sm:mt-32 text-center" style={{ color: '#9ca3af' }}>
        <p className="text-sm">Powered by Zama FHEVM 🚀</p>
      </footer>
    </div>
  );
}
