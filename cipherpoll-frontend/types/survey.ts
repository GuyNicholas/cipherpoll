// Survey-related types matching the smart contract

export enum QuestionType {
  SingleChoice = 0,
  Rating = 1,
  YesNo = 2,
}

export interface Question {
  qType: QuestionType;
  questionText: string;
  options: string[];
  numOptions: number;
}

export interface Survey {
  id: number;
  creator: string;
  title: string;
  description: string;
  endTimestamp: number;
  isAnonymous: boolean;
  isEnded: boolean;
  responseCount: number;
  questionCount: number;
}

export interface CreateSurveyParams {
  title: string;
  description: string;
  endTimestamp: number;
  isAnonymous: boolean;
  questions: Question[];
}
