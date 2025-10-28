'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '../../hooks/useWallet';
import { useSurveyContract } from '../../hooks/useSurveyContract';
import { Survey } from '../../types/survey';

export default function BrowseSurveysPage() {
  const { connected } = useWallet();
  const { contract, canInteract } = useSurveyContract();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSurveys = async () => {
      if (!contract || !canInteract) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get total survey count
        const surveyCount = await contract.surveyCount();
        const totalSurveys = Number(surveyCount);

        console.log('[BrowseSurveys] Total surveys:', totalSurveys);

        if (totalSurveys === 0) {
          setSurveys([]);
          setLoading(false);
          return;
        }

        // Fetch all surveys
        const surveyPromises: Promise<Survey>[] = [];
        for (let i = 0; i < totalSurveys; i++) {
          surveyPromises.push(
            (async () => {
              const surveyData = await contract.getSurvey(i);
              return {
                id: i,
                creator: surveyData.creator,
                title: surveyData.title,
                description: surveyData.description,
                endTimestamp: Number(surveyData.endTimestamp),
                isAnonymous: surveyData.isAnonymous,
                isEnded: surveyData.isEnded,
                responseCount: Number(surveyData.responseCount),
                questionCount: Number(surveyData.questionCount),
              };
            })()
          );
        }

        const loadedSurveys = await Promise.all(surveyPromises);
        setSurveys(loadedSurveys);
        console.log('[BrowseSurveys] Loaded surveys:', loadedSurveys);

      } catch (err: any) {
        console.error('[BrowseSurveys] Failed to load surveys:', err);
        setError(err.message || 'Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, [contract, canInteract]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'No end date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const isActive = (survey: Survey) => {
    const now = Math.floor(Date.now() / 1000);
    return !survey.isEnded && (survey.endTimestamp === 0 || survey.endTimestamp > now);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Browse Surveys
          </h1>
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-300 text-lg">Loading surveys from blockchain...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Browse Surveys
          </h1>
          <div className="glass-card p-8 rounded-2xl border border-red-500/50 bg-red-500/10">
            <p className="text-red-300 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span>{error}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Browse Surveys
          </h1>
          <p className="text-gray-400 text-lg">
            Discover and participate in privacy-preserving surveys
          </p>
        </div>

        {!connected && (
          <div className="mb-8 p-5 rounded-xl glass-card border border-yellow-500/30">
            <p className="text-yellow-300 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              Connect your wallet to participate in surveys
            </p>
          </div>
        )}

        {!canInteract && connected && (
          <div className="mb-8 p-5 rounded-xl glass-card border border-cyan-500/30">
            <p className="text-cyan-300 flex items-center gap-2">
              <span className="text-xl">🔄</span>
              Initializing FHEVM... Please wait.
            </p>
          </div>
        )}

        {surveys.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-300">
              No Surveys Yet
            </h2>
            <p className="text-gray-400 mb-6">
              Be the first to create a privacy-preserving survey!
            </p>
            <Link
              href="/create"
              className="inline-block glass-button px-8 py-3 rounded-xl font-semibold text-white"
            >
              ✨ Create Survey
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-400">
                Found <span className="text-teal-400 font-semibold">{surveys.length}</span> survey{surveys.length !== 1 ? 's' : ''}
              </p>
              <Link
                href="/create"
                className="glass-button px-6 py-2.5 rounded-xl font-semibold text-white text-sm"
              >
                ✨ Create New
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {surveys.map((survey) => (
                <div key={survey.id}
                     className="glass-card p-8 rounded-2xl transition-all hover:scale-[1.02] hover:shadow-2xl group">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold mb-2 text-teal-400 group-hover:text-teal-300 transition-colors">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Created by {formatAddress(survey.creator)}
                    </p>
                  </div>

                  <p className="mb-6 text-gray-300 leading-relaxed line-clamp-3">
                    {survey.description || 'No description provided'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6 text-sm">
                    <span className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/30">
                      {survey.responseCount} response{survey.responseCount !== 1 ? 's' : ''}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {survey.questionCount} question{survey.questionCount !== 1 ? 's' : ''}
                    </span>
                    {survey.isAnonymous && (
                      <span className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                        🔒 Anonymous
                      </span>
                    )}
                    {isActive(survey) ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        ✓ Active
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                        ✖️ Ended
                      </span>
                    )}
                  </div>

                  {survey.endTimestamp > 0 && (
                    <p className="text-xs text-gray-500 mb-4">
                      Ends: {formatDate(survey.endTimestamp)}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Link
                      href={`/survey/${survey.id}`}
                      className={`flex-1 px-5 py-3 rounded-xl font-semibold text-center transition-all ${
                        connected && isActive(survey)
                          ? 'glass-button text-white' 
                          : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={(e) => (!connected || !isActive(survey)) && e.preventDefault()}
                    >
                      {isActive(survey) ? '📝 Participate' : '🔒 Closed'}
                    </Link>
                    <Link
                      href={`/stats/${survey.id}`}
                      className="px-5 py-3 rounded-xl font-semibold transition-all text-white border-2 border-green-500/50 hover:border-green-500 hover:bg-green-500/10"
                      title="View Statistics"
                    >
                      📊
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 glass-card p-6 rounded-xl border border-teal-500/20 text-center">
          <h3 className="font-semibold text-teal-400 mb-3 flex items-center justify-center gap-2">
            <span className="text-xl">ℹ️</span>
            How it Works
          </h3>
          <p className="text-gray-400 text-sm">
            All surveys are stored on-chain. Responses are encrypted using FHEVM,
            ensuring privacy while allowing statistical analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
