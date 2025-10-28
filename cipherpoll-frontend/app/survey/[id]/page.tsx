'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '../../../hooks/useWallet';
import { useFhevm } from '../../../hooks/useFhevm';
import { useSurveyContract } from '../../../hooks/useSurveyContract';
import { Survey, Question, QuestionType } from '../../../types/survey';
import designTokens from '../../../design-tokens';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = Number(params.id);

  const { connected, account } = useWallet();
  const { contract, getSurvey, getQuestion, canInteract, address: contractAddress } = useSurveyContract();
  const { instance: fhevmInstance } = useFhevm();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        console.log('[SurveyPage] Loaded questions:', questionsData);
        console.log('[SurveyPage] Question details:', questionsData.map((q, i) => ({
          index: i,
          type: q.qType,
          text: q.questionText,
          optionsCount: q.options?.length || 0,
          options: q.options,
        })));
        
        setQuestions(questionsData);

        // Initialize answers array
        setAnswers(new Array(surveyData.questionCount).fill(0));
      } catch (err) {
        console.error('Failed to load survey:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [surveyId, canInteract, getSurvey, getQuestion]);

  const handleAnswerChange = (questionIndex: number, value: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!survey || answers.some(a => a === undefined)) {
      setError('Please answer all questions');
      return;
    }

    if (!contract || !contractAddress) {
      setError('Contract not initialized');
      return;
    }

    if (!fhevmInstance || !account) {
      setError('FHEVM not ready or wallet not connected');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSubmitSuccess(false);

      console.log('[SurveyPage] Encrypting answers:', answers);

      // Create encrypted input for all answers
      const input = fhevmInstance.createEncryptedInput(contractAddress, account);
      
      // Add each answer as encrypted uint8
      for (const answer of answers) {
        input.add8(answer);
      }

      // Encrypt all answers (async operation)
      console.log('[SurveyPage] Starting encryption...');
      const encryptedData = await input.encrypt();
      
      console.log('[SurveyPage] Encryption complete. Encrypted data:', {
        handlesCount: encryptedData.handles?.length || 0,
        inputProofLength: encryptedData.inputProof?.length || 0,
      });

      // Call contract's submitAnswers method with encrypted data
      const tx = await contract.submitAnswers(
        surveyId,
        encryptedData.handles,
        encryptedData.inputProof
      );

      console.log('[SurveyPage] Transaction submitted:', tx.hash);
      await tx.wait();

      console.log('[SurveyPage] Transaction confirmed');
      setSubmitSuccess(true);
      
      setTimeout(() => {
        router.push('/my-responses');
      }, 2000);
    } catch (err: any) {
      console.error('[SurveyPage] Submit failed:', err);
      setError(err.message || 'Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8"
           style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4"
              style={{ color: designTokens.colors.text }}>
            Please connect your wallet to participate
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-xl" style={{ color: designTokens.colors.text }}>
          Loading survey...
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-xl" style={{ color: designTokens.colors.text }}>
          Survey not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8"
         style={{ backgroundColor: designTokens.colors.background }}>
      <div className="max-w-3xl mx-auto">
        {/* Survey Header */}
        <div className="mb-8 p-6 rounded-xl backdrop-blur-lg"
             style={{ 
               backgroundColor: designTokens.colors.backgroundDark,
               border: `2px solid ${designTokens.colors.primary}40`,
               boxShadow: designTokens.boxShadow,
             }}>
          <h1 className="text-3xl font-bold mb-4"
              style={{ color: designTokens.colors.primary }}>
            {survey.title}
          </h1>
          <p className="mb-4" style={{ color: designTokens.colors.text }}>
            {survey.description}
          </p>
          <div className="flex gap-4 text-sm opacity-70"
               style={{ color: designTokens.colors.text }}>
            <span>Created by: {survey.creator.slice(0, 6)}...{survey.creator.slice(-4)}</span>
            <span>•</span>
            <span>{survey.responseCount} responses</span>
            <span>•</span>
            <span>{survey.isAnonymous ? 'Anonymous' : 'Public'}</span>
          </div>
        </div>

        {/* Debug Panel (temporary) */}
        {process.env.NODE_ENV === 'development' && questions.length > 0 && (
          <div className="glass-card p-4 rounded-xl mb-6 border border-yellow-500/30 bg-yellow-500/10">
            <details>
              <summary className="cursor-pointer text-yellow-300 font-semibold mb-2">
                🔍 Debug: Question Data
              </summary>
              <pre className="text-xs text-gray-300 overflow-auto">
                {JSON.stringify(questions, (key, value) => 
                  typeof value === 'bigint' ? value.toString() : value
                , 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={index}
                 className="p-6 rounded-xl backdrop-blur-lg"
                 style={{ 
                   backgroundColor: designTokens.colors.backgroundDark,
                   border: `1px solid ${designTokens.colors.secondary}20`,
                   boxShadow: designTokens.boxShadow,
                 }}>
              <h3 className="text-lg font-semibold mb-4"
                  style={{ color: designTokens.colors.secondary }}>
                {index + 1}. {question.questionText}
              </h3>

              {question.qType === QuestionType.SingleChoice && (
                <div className="space-y-2">
                  {(!question.options || question.options.length === 0) ? (
                    <div className="text-red-400 text-sm">
                      ⚠️ No options available for this question
                    </div>
                  ) : (
                    question.options.map((option, optIndex) => (
                    <label key={optIndex}
                           className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:opacity-80"
                           style={{ 
                             backgroundColor: answers[index] === optIndex 
                               ? designTokens.colors.primary + '20' 
                               : 'transparent',
                             border: `1px solid ${designTokens.colors.primary}40`,
                           }}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        checked={answers[index] === optIndex}
                        onChange={() => handleAnswerChange(index, optIndex)}
                        className="w-4 h-4"
                      />
                      <span style={{ color: designTokens.colors.text }}>
                        {option}
                      </span>
                    </label>
                    ))
                  )}
                </div>
              )}

              {question.qType === QuestionType.Rating && (
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleAnswerChange(index, rating)}
                      className="w-12 h-12 rounded-lg font-semibold transition-all hover:scale-110"
                      style={{
                        backgroundColor: answers[index] === rating 
                          ? designTokens.colors.accent 
                          : designTokens.colors.backgroundDark,
                        color: answers[index] === rating ? 'white' : designTokens.colors.text,
                        border: `2px solid ${designTokens.colors.accent}`,
                      }}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}

              {question.qType === QuestionType.YesNo && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAnswerChange(index, 1)}
                    className="px-8 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{
                      backgroundColor: answers[index] === 1 
                        ? designTokens.colors.secondary 
                        : designTokens.colors.backgroundDark,
                      color: answers[index] === 1 ? 'white' : designTokens.colors.text,
                      border: `2px solid ${designTokens.colors.secondary}`,
                    }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => handleAnswerChange(index, 0)}
                    className="px-8 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{
                      backgroundColor: answers[index] === 0 
                        ? designTokens.colors.secondary 
                        : designTokens.colors.backgroundDark,
                      color: answers[index] === 0 ? 'white' : designTokens.colors.text,
                      border: `2px solid ${designTokens.colors.secondary}`,
                    }}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !canInteract || !fhevmInstance}
            className="px-12 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-80 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: designTokens.colors.primary,
              color: 'white',
              boxShadow: designTokens.boxShadow,
            }}
          >
            {isSubmitting ? 'Encrypting & Submitting...' : !fhevmInstance ? 'Initializing FHEVM...' : 'Submit Survey'}
          </button>

          {!fhevmInstance && canInteract && (
            <div className="text-yellow-400 text-sm">
              ⏳ Please wait for FHEVM to initialize...
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          {submitSuccess && (
            <div className="text-green-500 text-sm font-semibold">
              ✅ Survey submitted successfully! Redirecting...
            </div>
          )}

          <p className="text-sm opacity-70 text-center max-w-md"
             style={{ color: designTokens.colors.text }}>
            🔒 Your answers will be encrypted using FHE before submission.
            No one can see your individual responses, including the survey creator.
          </p>
        </div>
      </div>
    </div>
  );
}

