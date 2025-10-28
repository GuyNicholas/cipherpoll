'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '../../hooks/useWallet';
import { useSurveyContract } from '../../hooks/useSurveyContract';
import { Survey } from '../../types/survey';

export default function MyResponsesPage() {
  const { connected, account } = useWallet();
  const { contract, canInteract } = useSurveyContract();

  const [respondedSurveys, setRespondedSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMyResponses = async () => {
      if (!contract || !canInteract || !account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get total survey count
        const surveyCount = await contract.surveyCount();
        const totalSurveys = Number(surveyCount);

        console.log('[MyResponses] Total surveys:', totalSurveys);
        console.log('[MyResponses] Current account:', account);

        if (totalSurveys === 0) {
          setRespondedSurveys([]);
          setLoading(false);
          return;
        }

        // Check which surveys the user has responded to
        const surveyPromises: Promise<Survey | null>[] = [];
        for (let i = 0; i < totalSurveys; i++) {
          surveyPromises.push(
            (async () => {
              try {
                // Check if user has submitted to this survey
                const hasSubmitted = await contract.hasSubmitted(i, account);
                
                if (hasSubmitted) {
                  const surveyData = await contract.getSurvey(i);
                  return {
                    id: i,
                    creator: surveyData.creator,
                    title: surveyData.title,
                    description: surveyData.description,
                    endTimestamp: Number(surveyData.endTimestamp),
                    isAnonymous: Boolean(surveyData.isAnonymous),
                    isEnded: Boolean(surveyData.isEnded),
                    responseCount: Number(surveyData.responseCount),
                    questionCount: Number(surveyData.questionCount),
                  };
                }
                return null;
              } catch (err) {
                console.error(`Failed to check survey ${i}:`, err);
                return null;
              }
            })()
          );
        }

        const loadedSurveys = await Promise.all(surveyPromises);
        const filteredSurveys = loadedSurveys.filter((s): s is Survey => s !== null);
        
        setRespondedSurveys(filteredSurveys);
        console.log('[MyResponses] Responded surveys:', filteredSurveys);

      } catch (err: any) {
        console.error('[MyResponses] Failed to load responses:', err);
        setError(err.message || 'Failed to load your responses');
      } finally {
        setLoading(false);
      }
    };

    if (connected && account) {
      loadMyResponses();
    } else {
      setLoading(false);
    }
  }, [contract, canInteract, account, connected]);

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'No end date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  if (!connected) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-6">🔐</div>
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Wallet Connection Required
            </h1>
            <p className="text-gray-300 mb-8 text-lg">
              Please connect your wallet to view your responses
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-gradient">
            My Responses
          </h1>
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-300 text-lg">Loading your responses...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-8 text-gradient">
            My Responses
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-gradient">
              My Responses
            </h1>
            <p className="text-gray-400">
              Surveys you've participated in
            </p>
          </div>
          <Link
            href="/surveys"
            className="glass-button px-6 py-3 rounded-xl font-semibold text-white"
          >
            📋 Browse Surveys
          </Link>
        </div>

        {!canInteract && (
          <div className="mb-8 p-5 rounded-xl glass-card border border-cyan-500/30">
            <p className="text-cyan-300 flex items-center gap-2">
              <span className="text-xl">🔄</span>
              Initializing FHEVM... Please wait.
            </p>
          </div>
        )}

        {respondedSurveys.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-300">
              No Responses Yet
            </h2>
            <p className="text-gray-400 mb-6">
              You haven't participated in any surveys yet
            </p>
            <Link
              href="/surveys"
              className="inline-block glass-button px-8 py-3 rounded-xl font-semibold text-white"
            >
              📋 Browse Available Surveys
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-gray-400">
              You have responded to <span className="text-teal-400 font-semibold">{respondedSurveys.length}</span> survey{respondedSurveys.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-6">
              {respondedSurveys.map((survey) => (
                <div key={survey.id}
                     className="glass-card p-8 rounded-2xl transition-all hover:shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 text-teal-400">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Survey ID: #{survey.id} • Created by {survey.creator.slice(0, 6)}...{survey.creator.slice(-4)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/stats/${survey.id}`}
                        className="px-4 py-2 rounded-lg border-2 border-green-500/50 hover:border-green-500 hover:bg-green-500/10 text-green-300 font-semibold transition-all text-sm"
                        title="View Statistics"
                      >
                        📊 Stats
                      </Link>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-6 line-clamp-2">
                    {survey.description || 'No description provided'}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="glass-card p-4 rounded-xl border border-green-500/30">
                      <div className="text-2xl font-bold text-green-400">
                        ✓
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Submitted
                      </div>
                    </div>

                    <div className="glass-card p-4 rounded-xl border border-cyan-500/30">
                      <div className="text-2xl font-bold text-cyan-400">
                        {survey.questionCount}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Question{survey.questionCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="glass-card p-4 rounded-xl border border-purple-500/30">
                      <div className="text-2xl font-bold text-purple-400">
                        {survey.responseCount}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Total Responses
                      </div>
                    </div>

                    <div className={`glass-card p-4 rounded-xl border ${
                      survey.isAnonymous 
                        ? 'border-teal-500/30' 
                        : 'border-yellow-500/30'
                    }`}>
                      <div className={`text-sm font-bold ${
                        survey.isAnonymous ? 'text-teal-400' : 'text-yellow-400'
                      }`}>
                        {survey.isAnonymous ? '🔒 Private' : '👤 Public'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Privacy
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-500">
                      {survey.endTimestamp > 0 ? (
                        <>
                          {survey.isEnded 
                            ? `Ended: ${formatDate(survey.endTimestamp)}`
                            : `Ends: ${formatDate(survey.endTimestamp)}`
                          }
                        </>
                      ) : (
                        <>No end date</>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-green-400">✓</span>
                      <span>Your response has been submitted</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 glass-card p-6 rounded-xl border border-teal-500/20 text-center">
          <h3 className="font-semibold text-teal-400 mb-3 flex items-center justify-center gap-2">
            <span className="text-xl">🔐</span>
            Privacy & Security
          </h3>
          <ul className="text-gray-400 text-sm space-y-2 text-left max-w-2xl mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>Your responses are encrypted using FHEVM and stored on-chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>Only aggregate statistics can be computed, individual answers remain private</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>No one can see your individual responses, not even the survey creator</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>You can view aggregate statistics for all surveys you've participated in</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
