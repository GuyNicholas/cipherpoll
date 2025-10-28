'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '../../hooks/useWallet';
import { useFhevm } from '../../hooks/useFhevm';
import { useSurveyContract } from '../../hooks/useSurveyContract';
import { QuestionType, type Question } from '../../types/survey';

interface QuestionForm extends Question {
  id: string;
}

export default function CreateSurvey() {
  const router = useRouter();
  const { connected, account } = useWallet();
  const { isReady: fhevmReady } = useFhevm();
  const { contract, isReady: contractReady } = useSurveyContract();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      id: '1',
      qType: QuestionType.SingleChoice,
      questionText: '',
      options: ['Option 1', 'Option 2', 'Option 3'],
      numOptions: 3,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const addQuestion = () => {
    const newQuestion: QuestionForm = {
      id: Date.now().toString(),
      qType: QuestionType.SingleChoice,
      questionText: '',
      options: ['Option 1', 'Option 2'],
      numOptions: 2,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: keyof QuestionForm, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const updateQuestionType = (id: string, newType: QuestionType) => {
    setQuestions(questions.map(q => {
      if (q.id !== id) return q;

      let options: string[] = [];
      let numOptions = 0;

      switch (newType) {
        case QuestionType.SingleChoice:
          options = ['Option 1', 'Option 2', 'Option 3'];
          numOptions = 3;
          break;
        case QuestionType.Rating:
          options = Array.from({ length: 10 }, (_, i) => `${i + 1}`);
          numOptions = 10;
          break;
        case QuestionType.YesNo:
          options = ['Yes', 'No'];
          numOptions = 2;
          break;
      }

      return {
        ...q,
        qType: newType,
        options,
        numOptions,
      };
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.qType === QuestionType.SingleChoice && q.options.length < 10) {
        const newOptions = [...q.options, `Option ${q.options.length + 1}`];
        return {
          ...q,
          options: newOptions,
          numOptions: newOptions.length,
        };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        const newOptions = q.options.filter((_, idx) => idx !== optionIndex);
        return {
          ...q,
          options: newOptions,
          numOptions: newOptions.length,
        };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Please enter a survey title');
      return;
    }

    if (questions.some(q => !q.questionText.trim())) {
      setError('All questions must have text');
      return;
    }

    if (!endDate) {
      setError('Please select an end date');
      return;
    }

    if (!contract || !contractReady) {
      setError('Contract not ready. Please ensure wallet is connected and FHEVM is initialized.');
      return;
    }

    try {
      setIsSubmitting(true);
      setTxStatus('Preparing transaction...');

      // Convert end date to timestamp
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

      // Prepare questions for contract
      const contractQuestions = questions.map(q => ({
        qType: q.qType,
        questionText: q.questionText,
        options: q.options,
        numOptions: q.numOptions,
      }));

      console.log('[CreateSurvey] Submitting survey with questions:', contractQuestions);
      console.log('[CreateSurvey] Question options:', contractQuestions.map((q, i) => ({
        questionIndex: i,
        optionsCount: q.options.length,
        options: q.options,
      })));

      setTxStatus('Waiting for transaction confirmation...');

      // Call contract
      const tx = await contract.createSurvey(
        title,
        description,
        endTimestamp,
        isAnonymous,
        contractQuestions
      );

      setTxStatus('Transaction submitted. Waiting for confirmation...');
      const receipt = await tx.wait();

      setTxStatus('Survey created successfully! Redirecting...');

      // Extract survey ID from event logs if available
      let surveyId = 0;
      if (receipt.logs && receipt.logs.length > 0) {
        // Try to parse SurveyCreated event
        try {
          const eventSignature = contract.interface.getEvent('SurveyCreated');
          const log = receipt.logs.find((log: any) => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed?.name === 'SurveyCreated';
            } catch {
              return false;
            }
          });

          if (log) {
            const parsed = contract.interface.parseLog(log);
            surveyId = Number(parsed?.args?.surveyId || 0);
          }
        } catch (err) {
          console.warn('Failed to parse event:', err);
        }
      }

      // Redirect after success
      setTimeout(() => {
        if (surveyId > 0) {
          router.push(`/survey/${surveyId}`);
        } else {
          router.push('/my-surveys');
        }
      }, 1500);

    } catch (err: any) {
      console.error('Failed to create survey:', err);
      setError(err.message || 'Failed to create survey. Please try again.');
      setTxStatus('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show connection required message
  if (!connected) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="text-teal-400 hover:text-teal-300 mb-6 inline-block">
            ← Back to Home
          </Link>

          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-6xl mb-6">🔐</div>
            <h1 className="text-4xl font-bold mb-4 text-gradient">
              Wallet Connection Required
            </h1>
            <p className="text-gray-300 mb-8 text-lg">
              Please connect your wallet to create a survey
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl border-2 border-teal-500/50 hover:border-teal-500 text-white"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-teal-400 hover:text-teal-300 inline-block mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-5xl font-bold mb-3 text-gradient">
            Create New Survey
          </h1>
          <p className="text-gray-400 text-lg">
            All data will be stored on-chain with encrypted responses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl">
            <h2 className="text-2xl font-bold mb-6 text-teal-400">Survey Information</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Community Feedback Survey"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-500"
                  required
                  maxLength={200}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context about this survey..."
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-500 h-24 resize-none"
                  maxLength={1000}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    End Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                    min={new Date().toISOString().split('T')[0]}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Privacy Setting
                  </label>
                  <div className="flex items-center h-12 px-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 text-teal-500 rounded focus:ring-2 focus:ring-teal-500"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="anonymous" className="ml-3 text-gray-300 cursor-pointer">
                      Anonymous Responses
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-green-400">Questions</h2>
              <span className="text-sm text-gray-400">{questions.length} question(s)</span>
            </div>
            
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-5 bg-gray-900/30 rounded-xl border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-lg text-cyan-400">Q{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.qType}
                        onChange={(e) => updateQuestionType(q.id, Number(e.target.value) as QuestionType)}
                        className="text-sm px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-gray-300"
                        disabled={isSubmitting}
                      >
                        <option value={QuestionType.SingleChoice}>Single Choice</option>
                        <option value={QuestionType.Rating}>Rating (1-10)</option>
                        <option value={QuestionType.YesNo}>Yes/No</option>
                      </select>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="text-red-400 hover:text-red-300 text-xl px-2"
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    value={q.questionText}
                    onChange={(e) => updateQuestion(q.id, 'questionText', e.target.value)}
                    placeholder="Enter your question here..."
                    className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                    required
                    disabled={isSubmitting}
                  />

                  {q.qType === QuestionType.SingleChoice && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-400 mb-2">Options:</label>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="w-8 text-gray-500 text-sm">{optIdx + 1}.</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white"
                            disabled={isSubmitting}
                            required
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, optIdx)}
                              className="text-red-400 hover:text-red-300 px-2"
                              disabled={isSubmitting}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 10 && (
                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="text-teal-400 hover:text-teal-300 text-sm mt-2"
                          disabled={isSubmitting}
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                  )}

                  {q.qType === QuestionType.Rating && (
                    <div className="text-sm text-gray-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                      💡 Users will rate from 1 to 10
                    </div>
                  )}

                  {q.qType === QuestionType.YesNo && (
                    <div className="text-sm text-gray-400 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      💡 Users will answer Yes or No
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addQuestion}
                className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-teal-500 rounded-xl text-teal-400 hover:text-teal-300 transition-all"
                disabled={isSubmitting}
              >
                + Add Question
              </button>
            </div>
          </div>

          {/* Status Messages */}
          {txStatus && (
            <div className="glass-card p-4 rounded-xl border border-teal-500/50 bg-teal-500/10">
              <p className="text-teal-300 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                {txStatus}
              </p>
            </div>
          )}

          {error && (
            <div className="glass-card p-4 rounded-xl border border-red-500/50 bg-red-500/10">
              <p className="text-red-300 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/"
              className="px-8 py-3 border-2 border-gray-600 hover:border-gray-500 rounded-xl text-gray-300 hover:text-white transition-all font-semibold"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !contractReady}
              className="glass-button px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : '✨ Create Survey'}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-8 glass-card p-6 rounded-xl border border-cyan-500/30">
          <h3 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <span className="text-xl">ℹ️</span>
            How it works
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>Survey metadata (title, description, questions) is stored on-chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>User responses are encrypted using FHEVM before submission</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>Only aggregate statistics can be computed, individual answers remain private</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-400">•</span>
              <span>You'll need to sign a transaction and pay gas fees</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
