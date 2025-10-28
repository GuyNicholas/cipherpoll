'use client';

import { useMemo, useCallback } from 'react';
import { Contract } from 'ethers';
import { useWallet } from './useWallet';
import { useFhevm } from './useFhevm';
import { SurveyCoreABI } from '../abi/SurveyCoreABI';
import { getSurveyCoreAddress } from '../abi/SurveyCoreAddresses';
import { Survey, Question } from '../types/survey';

export function useSurveyContract() {
  const { signer, chainId } = useWallet();
  const { isReady: fhevmReady } = useFhevm();

  const contract = useMemo(() => {
    if (!signer || !chainId) {
      return null;
    }

    const address = getSurveyCoreAddress(chainId);
    if (!address) {
      console.error('[useSurveyContract] No contract address for chainId:', chainId);
      return null;
    }

    try {
      return new Contract(address, SurveyCoreABI, signer);
    } catch (error) {
      console.error('[useSurveyContract] Failed to create contract instance:', error);
      return null;
    }
  }, [signer, chainId]);

  const getSurvey = useCallback(async (surveyId: number): Promise<Survey> => {
    if (!contract) throw new Error('Contract not initialized');
    
    const surveyData = await contract.getSurvey(surveyId);
    
    // Convert all BigInt values to Number
    return {
      id: surveyId,
      creator: surveyData.creator,
      title: surveyData.title,
      description: surveyData.description,
      endTimestamp: Number(surveyData.endTimestamp),
      isAnonymous: Boolean(surveyData.isAnonymous),
      isEnded: Boolean(surveyData.isEnded),
      responseCount: Number(surveyData.responseCount),
      questionCount: Number(surveyData.questionCount),
    };
  }, [contract]);

  const getQuestion = useCallback(async (surveyId: number, questionId: number): Promise<Question> => {
    if (!contract) throw new Error('Contract not initialized');
    
    const questionData = await contract.getQuestion(surveyId, questionId);
    
    // Convert BigInt to Number and Proxy to Array
    const qType = Number(questionData.qType);
    const questionText = questionData.questionText;
    const numOptions = Number(questionData.numOptions);
    
    // Convert Proxy(Result) to regular array
    const options: string[] = [];
    if (questionData.options) {
      for (let i = 0; i < questionData.options.length; i++) {
        options.push(questionData.options[i]);
      }
    }
    
    console.log(`[useSurveyContract] getQuestion(${surveyId}, ${questionId}):`, {
      qType,
      questionText,
      optionsLength: options.length,
      options,
      numOptions,
    });
    
    return {
      qType,
      questionText,
      options,
      numOptions,
    };
  }, [contract]);

  const getEncryptedStats = useCallback(async (
    surveyId: number,
    questionId: number,
    questionType: number,
    numOptions: number
  ) => {
    if (!contract) throw new Error('Contract not initialized');
    
    console.log(`[useSurveyContract] Getting encrypted stats for survey ${surveyId}, question ${questionId}, type ${questionType}`);
    
    const handles: string[] = [];
    
    try {
      if (questionType === 0) {
        // Single Choice - get counts for each option
        for (let i = 0; i < numOptions; i++) {
          const encryptedCount = await contract.singleChoiceStats(surveyId, questionId, i);
          handles.push(encryptedCount);
          console.log(`[useSurveyContract] Option ${i} handle:`, encryptedCount);
        }
      } else if (questionType === 1) {
        // Rating - get all rating scores
        const scores = await contract.getRatingScores(surveyId, questionId);
        for (let i = 0; i < scores.length; i++) {
          handles.push(scores[i]);
        }
        console.log(`[useSurveyContract] Rating scores (${scores.length} entries):`, scores);
      } else if (questionType === 2) {
        // Yes/No - get yes and no counts
        const stats = await contract.yesNoStats(surveyId, questionId);
        handles.push(stats.yesCount);
        handles.push(stats.noCount);
        console.log(`[useSurveyContract] Yes/No handles:`, stats);
      }
      
      return handles;
    } catch (error) {
      console.error('[useSurveyContract] Failed to get encrypted stats:', error);
      throw error;
    }
  }, [contract]);

  const canInteract = !!contract && fhevmReady;

  return {
    contract,
    isReady: canInteract,
    address: chainId ? getSurveyCoreAddress(chainId) : null,
    getSurvey,
    getQuestion,
    getEncryptedStats,
    canInteract,
  };
}
