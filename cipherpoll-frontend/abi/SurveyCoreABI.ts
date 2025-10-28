// Auto-generated file - DO NOT EDIT
// Generated from deployments/SurveyCore.json

export const SurveyCoreABI = [
  {
    "inputs": [],
    "name": "AlreadySubmitted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyTitle",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEndTime",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidOptionIndex",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidQuestionType",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRating",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoQuestions",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotCreator",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SurveyAlreadyEnded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SurveyExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SurveyNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooManyQuestions",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTimestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "questionCount",
        "type": "uint8"
      }
    ],
    "name": "SurveyCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      }
    ],
    "name": "SurveyEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "participant",
        "type": "address"
      }
    ],
    "name": "SurveySubmitted",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "endTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isAnonymous",
        "type": "bool"
      },
      {
        "components": [
          {
            "internalType": "enum SurveyCore.QuestionType",
            "name": "qType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "questionText",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "options",
            "type": "string[]"
          },
          {
            "internalType": "uint8",
            "name": "numOptions",
            "type": "uint8"
          }
        ],
        "internalType": "struct SurveyCore.Question[]",
        "name": "questions",
        "type": "tuple[]"
      }
    ],
    "name": "createSurvey",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      }
    ],
    "name": "endSurvey",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "qId",
        "type": "uint256"
      }
    ],
    "name": "getMyAnswer",
    "outputs": [
      {
        "internalType": "euint8",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "getMySurveys",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "qId",
        "type": "uint256"
      }
    ],
    "name": "getQuestion",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum SurveyCore.QuestionType",
            "name": "qType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "questionText",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "options",
            "type": "string[]"
          },
          {
            "internalType": "uint8",
            "name": "numOptions",
            "type": "uint8"
          }
        ],
        "internalType": "struct SurveyCore.Question",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      }
    ],
    "name": "getQuestions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum SurveyCore.QuestionType",
            "name": "qType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "questionText",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "options",
            "type": "string[]"
          },
          {
            "internalType": "uint8",
            "name": "numOptions",
            "type": "uint8"
          }
        ],
        "internalType": "struct SurveyCore.Question[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "qId",
        "type": "uint256"
      }
    ],
    "name": "getRatingScores",
    "outputs": [
      {
        "internalType": "euint32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      }
    ],
    "name": "getSurvey",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isAnonymous",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isEnded",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "responseCount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "questionCount",
            "type": "uint8"
          }
        ],
        "internalType": "struct SurveyCore.Survey",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasSubmitted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "singleChoiceStats",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "surveyId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint8[]",
        "name": "encryptedAnswers",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "submitAnswers",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "surveyCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "surveys",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTimestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isAnonymous",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isEnded",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "responseCount",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "questionCount",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "yesNoStats",
    "outputs": [
      {
        "internalType": "euint32",
        "name": "yesCount",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "noCount",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export type SurveyCoreABI = typeof SurveyCoreABI;
