'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '../../../hooks/useWallet';
import { useFhevm } from '../../../hooks/useFhevm';
import { useSurveyContract } from '../../../hooks/useSurveyContract';
import { Survey, Question, QuestionType } from '../../../types/survey';
import { FhevmDecryptionSignature } from '../../../fhevm/FhevmDecryptionSignature';

interface DecryptedStats {
  [questionId: number]: {
    type: QuestionType;
    data: number[];
  };
}

export default function StatsPage() {
  const params = useParams();
  const surveyId = Number(params.id);

  const { connected, account, signer } = useWallet();
  const { instance: fhevmInstance, isReady: fhevmReady } = useFhevm();
  const { getSurvey, getQuestion, getEncryptedStats, canInteract, address: contractAddress } = useSurveyContract();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedStats, setDecryptedStats] = useState<DecryptedStats>({});
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Load survey data
  useEffect(() => {
    const loadSurvey = async () => {
      try {
        if (!canInteract) return;

        const surveyData = await getSurvey(surveyId);
        setSurvey(surveyData);

        // Load all questions
        const questionPromises = [];
        for (let i = 0; i < surveyData.questionCount; i++) {
          questionPromises.push(getQuestion(surveyId, i));
        }
        const questionsData = await Promise.all(questionPromises);
        setQuestions(questionsData);
        
        console.log('[StatsPage] Survey loaded:', surveyData);
        console.log('[StatsPage] Questions loaded:', questionsData);
      } catch (err: any) {
        console.error('[StatsPage] Failed to load survey:', err);
        setError(err.message || 'Failed to load survey data');
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [surveyId, canInteract, getSurvey, getQuestion]);

  const handleDecryptStats = async () => {
    if (!fhevmInstance || !account || !signer || !contractAddress || !survey) {
      console.error('[StatsPage] Missing requirements for decryption');
      return;
    }

    setDecrypting(true);
    setDecryptError(null);

    try {
      console.log('[StatsPage] Starting decryption process...');

      // Get or create decryption signature
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        signer
      );

      if (!sig) {
        throw new Error('Failed to create decryption signature');
      }

      console.log('[StatsPage] Decryption signature ready');

      const newDecryptedStats: DecryptedStats = {};

      // Decrypt statistics for each question
      for (let qId = 0; qId < questions.length; qId++) {
        const question = questions[qId];
        console.log(`[StatsPage] Decrypting question ${qId}, type: ${question.qType}`);

        try {
          // Get encrypted handles
          const handles = await getEncryptedStats(
            surveyId,
            qId,
            question.qType,
            question.numOptions
          );

          if (handles.length === 0) {
            console.log(`[StatsPage] Question ${qId}: No data yet`);
            continue;
          }

          console.log(`[StatsPage] Question ${qId}: Got ${handles.length} handles`);

          // Prepare handles for decryption
          const handleObjects = handles.map((handle) => ({
            handle,
            contractAddress,
          }));

          // Decrypt
          const decryptedData = await fhevmInstance.userDecrypt(
            handleObjects,
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );

          console.log(`[StatsPage] Question ${qId}: Decrypted data:`, decryptedData);

          // Convert decrypted values to numbers
          const values: number[] = [];
          for (const handle of handles) {
            const value = decryptedData[handle];
            values.push(typeof value === 'bigint' ? Number(value) : Number(value));
          }

          newDecryptedStats[qId] = {
            type: question.qType,
            data: values,
          };

          console.log(`[StatsPage] Question ${qId}: Processed values:`, values);
        } catch (err: any) {
          console.error(`[StatsPage] Failed to decrypt question ${qId}:`, err);
          // Continue with other questions even if one fails
        }
      }

      setDecryptedStats(newDecryptedStats);
      console.log('[StatsPage] All decryption complete:', newDecryptedStats);
    } catch (err: any) {
      console.error('[StatsPage] Decryption failed:', err);
      setDecryptError(err.message || 'Failed to decrypt statistics');
    } finally {
      setDecrypting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'No end date';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  const renderQuestionStats = (question: Question, qId: number) => {
    const stats = decryptedStats[qId];
    const hasStats = stats && stats.data.length > 0;

    if (question.qType === QuestionType.SingleChoice) {
      // Single Choice
      return (
        <div className="bg-gray-900/30 p-6 rounded-lg">
          <div className="text-sm font-semibold text-gray-400 mb-4">Options:</div>
          <div className="space-y-3">
            {question.options.map((option, optIndex) => {
              const count = hasStats && stats.data[optIndex] !== undefined ? stats.data[optIndex] : null;
              const total = hasStats ? stats.data.reduce((sum, val) => sum + val, 0) : 0;
              const percentage = total > 0 && count !== null ? Math.round((count / total) * 100) : 0;

              return (
                <div key={optIndex} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-semibold text-sm flex-shrink-0">
                        {optIndex + 1}
                      </div>
                      <span className="text-gray-300">{option}</span>
                    </div>
                    <div className="text-right">
                      {count !== null ? (
                        <>
                          <span className="text-teal-400 font-bold text-lg">{count}</span>
                          <span className="text-gray-500 text-sm ml-2">({percentage}%)</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">🔒 Encrypted</span>
                      )}
                    </div>
                  </div>
                  {count !== null && total > 0 && (
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {hasStats && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Total responses: <span className="text-teal-400 font-semibold">
                  {stats.data.reduce((sum, val) => sum + val, 0)}
                </span>
              </span>
            </div>
          )}
        </div>
      );
    } else if (question.qType === QuestionType.YesNo) {
      // Yes/No
      const yesCount = hasStats && stats.data[0] !== undefined ? stats.data[0] : null;
      const noCount = hasStats && stats.data[1] !== undefined ? stats.data[1] : null;
      const total = yesCount !== null && noCount !== null ? yesCount + noCount : 0;
      const yesPercentage = total > 0 ? Math.round((yesCount! / total) * 100) : 0;
      const noPercentage = total > 0 ? Math.round((noCount! / total) * 100) : 0;

      return (
        <div className="bg-gray-900/30 p-6 rounded-lg">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="text-4xl mb-3">✓</div>
              <div className="text-green-400 font-semibold text-xl mb-2">Yes</div>
              {yesCount !== null ? (
                <>
                  <div className="text-3xl font-bold text-green-300 mb-1">{yesCount}</div>
                  <div className="text-sm text-gray-400">({yesPercentage}%)</div>
                </>
              ) : (
                <div className="text-xs text-gray-500">🔒 Encrypted count</div>
              )}
            </div>
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="text-4xl mb-3">✗</div>
              <div className="text-red-400 font-semibold text-xl mb-2">No</div>
              {noCount !== null ? (
                <>
                  <div className="text-3xl font-bold text-red-300 mb-1">{noCount}</div>
                  <div className="text-sm text-gray-400">({noPercentage}%)</div>
                </>
              ) : (
                <div className="text-xs text-gray-500">🔒 Encrypted count</div>
              )}
            </div>
          </div>
          {hasStats && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <span className="text-sm text-gray-400">
                Total responses: <span className="text-teal-400 font-semibold">{total}</span>
              </span>
            </div>
          )}
        </div>
      );
    } else if (question.qType === QuestionType.Rating) {
      // Rating
      const ratingCounts: { [rating: number]: number } = {};
      if (hasStats) {
        stats.data.forEach((rating) => {
          if (rating >= 1 && rating <= 10) {
            ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
          }
        });
      }

      const totalRatings = hasStats ? stats.data.length : 0;
      const averageRating = hasStats && totalRatings > 0
        ? (stats.data.reduce((sum, val) => sum + val, 0) / totalRatings).toFixed(1)
        : null;

      return (
        <div className="bg-gray-900/30 p-6 rounded-lg">
          {!hasStats ? (
            <>
              <div className="text-sm text-gray-400 mb-3">
                Ratings from 1 (lowest) to 10 (highest)
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="flex-1 h-12 rounded bg-gradient-to-t from-cyan-500/20 to-cyan-500/5 flex items-center justify-center text-cyan-400 text-sm font-semibold">
                    {i + 1}
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-3">
                🔒 Distribution is encrypted
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="text-sm text-gray-400 mb-2">Average Rating</div>
                <div className="text-5xl font-bold text-cyan-400">{averageRating}</div>
                <div className="text-sm text-gray-500">out of 10</div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 10 }, (_, i) => {
                  const rating = 10 - i;
                  const count = ratingCounts[rating] || 0;
                  const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;

                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="w-8 text-cyan-400 font-semibold text-sm text-right">
                        {rating}
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${percentage}%` }}
                        >
                          {count > 0 && (
                            <span className="text-xs text-white font-semibold">{count}</span>
                          )}
                        </div>
                      </div>
                      <div className="w-12 text-gray-400 text-xs text-right">
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-400">
                  Total ratings: <span className="text-cyan-400 font-semibold">{totalRatings}</span>
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Survey Statistics
          </h1>
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-300 text-lg">Loading survey statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Survey Statistics
          </h1>
          <div className="glass-card p-8 rounded-2xl border border-red-500/50 bg-red-500/10">
            <p className="text-red-300 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span>{error || 'Survey not found'}</span>
            </p>
            <Link href="/surveys" className="mt-4 inline-block text-teal-400 hover:text-teal-300">
              ← Back to Surveys
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCreator = account && survey.creator.toLowerCase() === account.toLowerCase();
  const hasDecryptedData = Object.keys(decryptedStats).length > 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/surveys" className="text-teal-400 hover:text-teal-300 inline-block mb-4">
            ← Back to Surveys
          </Link>
          <h1 className="text-5xl font-bold mb-4 text-gradient">
            Survey Statistics
          </h1>
          <p className="text-gray-400 text-lg">
            Aggregated results for: <span className="text-teal-400">{survey.title}</span>
          </p>
        </div>

        {/* Survey Overview */}
        <div className="glass-card p-8 rounded-2xl mb-8">
          <h2 className="text-3xl font-bold mb-4 text-teal-400">{survey.title}</h2>
          <p className="text-gray-300 mb-6">{survey.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-green-500/30">
              <div className="text-3xl font-bold text-green-400">
                {survey.responseCount}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Total Responses
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-cyan-500/30">
              <div className="text-3xl font-bold text-cyan-400">
                {survey.questionCount}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Questions
              </div>
            </div>

            <div className={`glass-card p-4 rounded-xl border ${
              survey.isAnonymous ? 'border-teal-500/30' : 'border-yellow-500/30'
            }`}>
              <div className={`text-lg font-bold ${
                survey.isAnonymous ? 'text-teal-400' : 'text-yellow-400'
              }`}>
                {survey.isAnonymous ? '🔒 Anonymous' : '👤 Public'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Privacy Mode
              </div>
            </div>

            <div className={`glass-card p-4 rounded-xl border ${
              survey.isEnded ? 'border-red-500/30' : 'border-emerald-500/30'
            }`}>
              <div className={`text-lg font-bold ${
                survey.isEnded ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {survey.isEnded ? '✖️ Ended' : '✓ Active'}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Status
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Created by: {survey.creator.slice(0, 6)}...{survey.creator.slice(-4)}
            {survey.endTimestamp > 0 && (
              <span className="ml-4">
                • {survey.isEnded ? 'Ended' : 'Ends'}: {formatDate(survey.endTimestamp)}
              </span>
            )}
            {isCreator && (
              <span className="ml-4 text-teal-400">• You are the creator</span>
            )}
          </div>
        </div>

        {/* Decrypt Button for Creator */}
        {isCreator && survey.responseCount > 0 && !hasDecryptedData && (
          <div className="glass-card p-6 rounded-xl border border-purple-500/30 bg-purple-500/10 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2 text-purple-300 flex items-center gap-2">
                  <span className="text-2xl">🔓</span>
                  Decrypt Statistics
                </h3>
                <p className="text-gray-300 mb-4">
                  As the survey creator, you can decrypt the aggregate statistics. This will reveal the total counts for each option/rating, but individual responses remain private.
                </p>
                <button
                  onClick={handleDecryptStats}
                  disabled={decrypting || !fhevmReady}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    decrypting || !fhevmReady
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'glass-button text-white hover:shadow-xl'
                  }`}
                >
                  {decrypting ? '🔄 Decrypting...' : '🔓 Decrypt Statistics'}
                </button>
                {!fhevmReady && (
                  <p className="text-sm text-yellow-400 mt-2">
                    ⏳ Waiting for FHEVM to initialize...
                  </p>
                )}
              </div>
            </div>
            {decryptError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">⚠️ {decryptError}</p>
              </div>
            )}
          </div>
        )}

        {hasDecryptedData && (
          <div className="glass-card p-6 rounded-xl border border-green-500/30 bg-green-500/10 mb-8">
            <p className="text-green-300 flex items-center gap-2">
              <span className="text-2xl">✓</span>
              <span className="font-semibold">Statistics decrypted successfully!</span>
            </p>
          </div>
        )}

        {/* Response Status */}
        {survey.responseCount === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-3 text-gray-300">
              No Responses Yet
            </h2>
            <p className="text-gray-400 mb-6">
              This survey hasn't received any responses yet. Statistics will appear once participants submit their answers.
            </p>
            {!survey.isEnded && (
              <Link
                href={`/survey/${surveyId}`}
                className="inline-block glass-button px-8 py-3 rounded-xl font-semibold text-white"
              >
                📝 Be the First to Respond
              </Link>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-4xl font-bold mb-6 text-gradient">Questions & Results</h2>
            
            <div className="space-y-6">
              {questions.map((question, index) => (
                <div key={index} className="glass-card p-8 rounded-2xl">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-green-400 mb-2">
                        Question {index + 1}
                      </h3>
                      <p className="text-lg text-gray-300">
                        {question.questionText}
                      </p>
                    </div>
                    <div className="ml-4 px-4 py-2 rounded-lg glass-card border border-cyan-500/30">
                      <div className="text-sm text-cyan-400 font-semibold">
                        {question.qType === QuestionType.SingleChoice && 'Single Choice'}
                        {question.qType === QuestionType.Rating && 'Rating (1-10)'}
                        {question.qType === QuestionType.YesNo && 'Yes/No'}
                      </div>
                    </div>
                  </div>

                  {renderQuestionStats(question, index)}

                  {!hasDecryptedData && (
                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-sm text-purple-300">
                        💡 <span className="font-semibold">Privacy Protection:</span> Individual responses are encrypted on-chain. 
                        {isCreator 
                          ? ' Click "Decrypt Statistics" above to view aggregate results.'
                          : ' Only the survey creator can decrypt aggregate statistics.'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Technical Info */}
        <div className="mt-12 glass-card p-6 rounded-xl border border-teal-500/20">
          <h3 className="font-semibold text-teal-400 mb-4 flex items-center gap-2 text-lg">
            <span className="text-xl">🔬</span>
            How FHEVM Statistics Work
          </h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-teal-400 mt-1">1.</span>
              <div>
                <strong className="text-gray-200">Encrypted Storage:</strong> All responses are encrypted client-side before submission and stored as encrypted integers (euint8, euint32) on-chain.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal-400 mt-1">2.</span>
              <div>
                <strong className="text-gray-200">Homomorphic Computation:</strong> The smart contract can perform arithmetic operations (addition, comparison) directly on encrypted values using FHE.add(), FHE.eq(), etc.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal-400 mt-1">3.</span>
              <div>
                <strong className="text-gray-200">Aggregate Statistics:</strong> Counts and sums are computed on encrypted data. The survey creator can decrypt aggregate results using their private key.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-teal-400 mt-1">4.</span>
              <div>
                <strong className="text-gray-200">Zero-Knowledge Privacy:</strong> No one, including miners and the contract creator, can see individual responses. Only aggregate patterns are revealed after creator decryption.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href={`/survey/${surveyId}`}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              survey.isEnded
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                : 'glass-button text-white'
            }`}
            onClick={(e) => survey.isEnded && e.preventDefault()}
          >
            {survey.isEnded ? '🔒 Survey Ended' : '📝 Participate in Survey'}
          </Link>
          <Link
            href="/surveys"
            className="px-6 py-3 rounded-xl font-semibold border-2 border-teal-500/50 hover:border-teal-500 text-white transition-all"
          >
            📋 Browse Other Surveys
          </Link>
        </div>
      </div>
    </div>
  );
}
