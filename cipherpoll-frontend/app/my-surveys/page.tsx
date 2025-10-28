'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '../../hooks/useWallet';
import { useSurveyContract } from '../../hooks/useSurveyContract';
import { Survey } from '../../types/survey';

export default function MySurveysPage() {
  const { connected, account } = useWallet();
  const { contract, canInteract } = useSurveyContract();

  const [mySurveys, setMySurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMySurveys = async () => {
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

        console.log('[MySurveys] Total surveys:', totalSurveys);
        console.log('[MySurveys] Current account:', account);

        if (totalSurveys === 0) {
          setMySurveys([]);
          setLoading(false);
          return;
        }

        // Fetch all surveys and filter by creator
        const surveyPromises: Promise<Survey | null>[] = [];
        for (let i = 0; i < totalSurveys; i++) {
          surveyPromises.push(
            (async () => {
              try {
                const surveyData = await contract.getSurvey(i);
                
                // Only include surveys created by current account
                if (surveyData.creator.toLowerCase() === account.toLowerCase()) {
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
                }
                return null;
              } catch (err) {
                console.error(`Failed to load survey ${i}:`, err);
                return null;
              }
            })()
          );
        }

        const loadedSurveys = await Promise.all(surveyPromises);
        const filteredSurveys = loadedSurveys.filter((s): s is Survey => s !== null);
        
        setMySurveys(filteredSurveys);
        console.log('[MySurveys] My surveys:', filteredSurveys);

      } catch (err: any) {
        console.error('[MySurveys] Failed to load surveys:', err);
        setError(err.message || 'Failed to load your surveys');
      } finally {
        setLoading(false);
      }
    };

    if (connected && account) {
      loadMySurveys();
    } else {
      setLoading(false);
    }
  }, [contract, canInteract, account, connected]);

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'No end date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const isActive = (survey: Survey) => {
    const now = Math.floor(Date.now() / 1000);
    return !survey.isEnded && (survey.endTimestamp === 0 || survey.endTimestamp > now);
  };

  const endSurvey = async (surveyId: number) => {
    if (!contract) return;
    
    try {
      const tx = await contract.endSurvey(surveyId);
      await tx.wait();
      
      // Reload surveys
      setMySurveys(prevSurveys =>
        prevSurveys.map(s =>
          s.id === surveyId ? { ...s, isEnded: true } : s
        )
      );
    } catch (err: any) {
      console.error('Failed to end survey:', err);
      alert('Failed to end survey: ' + (err.message || 'Unknown error'));
    }
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
              Please connect your wallet to view your surveys
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
            My Surveys
          </h1>
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-300 text-lg">Loading your surveys...</p>
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
            My Surveys
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
              My Surveys
            </h1>
            <p className="text-gray-400">
              Surveys you've created
            </p>
          </div>
          <Link
            href="/create"
            className="glass-button px-6 py-3 rounded-xl font-semibold text-white"
          >
            ✨ Create New
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

        {mySurveys.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-300">
              No Surveys Created Yet
            </h2>
            <p className="text-gray-400 mb-6">
              Start creating your first privacy-preserving survey!
            </p>
            <Link
              href="/create"
              className="inline-block glass-button px-8 py-3 rounded-xl font-semibold text-white"
            >
              ✨ Create Your First Survey
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-gray-400">
              You have created <span className="text-teal-400 font-semibold">{mySurveys.length}</span> survey{mySurveys.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-6">
              {mySurveys.map((survey) => (
                <div key={survey.id}
                     className="glass-card p-8 rounded-2xl transition-all hover:shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2 text-teal-400">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Survey ID: #{survey.id}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/survey/${survey.id}`}
                        className="px-4 py-2 rounded-lg border-2 border-teal-500/50 hover:border-teal-500 hover:bg-teal-500/10 text-teal-300 font-semibold transition-all text-sm"
                        title="Preview"
                      >
                        👁️ Preview
                      </Link>
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
                        {survey.responseCount}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Response{survey.responseCount !== 1 ? 's' : ''}
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

                    <div className="glass-card p-4 rounded-xl border border-teal-500/30">
                      <div className="text-sm font-bold text-teal-400">
                        {survey.isAnonymous ? '🔒 Anonymous' : '👤 Public'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Privacy
                      </div>
                    </div>

                    <div className={`glass-card p-4 rounded-xl border ${
                      isActive(survey) 
                        ? 'border-emerald-500/30' 
                        : 'border-red-500/30'
                    }`}>
                      <div className={`text-sm font-bold ${
                        isActive(survey) ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isActive(survey) ? '✓ Active' : '✖️ Ended'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Status
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-500">
                      {survey.endTimestamp > 0 ? (
                        <>Ends: {formatDate(survey.endTimestamp)}</>
                      ) : (
                        <>No end date</>
                      )}
                    </div>

                    {isActive(survey) && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to end "${survey.title}"? This action cannot be undone.`)) {
                            endSurvey(survey.id);
                          }
                        }}
                        className="px-4 py-2 rounded-lg border-2 border-red-500/50 hover:border-red-500 hover:bg-red-500/10 text-red-300 font-semibold transition-all text-sm"
                      >
                        🔒 End Survey
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 glass-card p-6 rounded-xl border border-teal-500/20 text-center">
          <h3 className="font-semibold text-teal-400 mb-3 flex items-center justify-center gap-2">
            <span className="text-xl">💡</span>
            Survey Management Tips
          </h3>
          <ul className="text-gray-400 text-sm space-y-2 text-left max-w-2xl mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>You can preview your surveys at any time</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>View real-time statistics as responses come in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>End a survey manually if needed (cannot be reopened)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>All individual responses remain encrypted and private</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
