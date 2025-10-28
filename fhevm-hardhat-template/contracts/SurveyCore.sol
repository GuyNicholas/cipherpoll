// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint8, euint32, ebool, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SurveyCore - Privacy-First On-Chain Survey System
/// @notice CipherPoll: Encrypted survey with on-chain metadata storage
/// @dev All survey metadata stored on-chain, answers encrypted with FHEVM
contract SurveyCore is SepoliaConfig {
    // ============ Structs & Enums ============

    struct Survey {
        address creator;
        string title;
        string description;
        uint256 createdAt;
        uint256 endTimestamp;
        bool isAnonymous;
        bool isEnded;
        uint256 responseCount;
        uint8 questionCount;
    }

    struct Question {
        QuestionType qType;
        string questionText;
        string[] options; // For SingleChoice/MultipleChoice
        uint8 numOptions;
    }

    enum QuestionType {
        SingleChoice, // euint8: option index 0-255
        Rating,       // euint8: score 1-10
        YesNo         // ebool: true/false
    }

    // ============ State Variables ============

    mapping(uint256 => Survey) public surveys;
    mapping(uint256 => Question[]) private surveyQuestions;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    // Statistics storage
    mapping(uint256 => mapping(uint256 => mapping(uint8 => euint32))) public singleChoiceStats;
    mapping(uint256 => mapping(uint256 => euint32[])) private ratingScores;
    mapping(uint256 => mapping(uint256 => YesNoStats)) public yesNoStats;

    // User answers (for participants to decrypt their own)
    mapping(uint256 => mapping(address => mapping(uint256 => euint8))) private userAnswers;

    struct YesNoStats {
        euint32 yesCount;
        euint32 noCount;
    }

    uint256 public surveyCount;

    // ============ Events ============

    event SurveyCreated(
        uint256 indexed surveyId,
        address indexed creator,
        string title,
        uint256 endTimestamp,
        uint8 questionCount
    );

    event SurveySubmitted(
        uint256 indexed surveyId,
        address indexed participant
    );

    event SurveyEnded(uint256 indexed surveyId);

    // ============ Errors ============

    error SurveyNotFound();
    error SurveyAlreadyEnded();
    error SurveyExpired();
    error AlreadySubmitted();
    error NotCreator();
    error InvalidQuestionType();
    error InvalidOptionIndex();
    error InvalidRating();
    error EmptyTitle();
    error NoQuestions();
    error TooManyQuestions();
    error InvalidEndTime();

    // ============ Modifiers ============

    modifier onlyCreator(uint256 surveyId) {
        if (msg.sender != surveys[surveyId].creator) revert NotCreator();
        _;
    }

    modifier surveyActive(uint256 surveyId) {
        if (surveys[surveyId].creator == address(0)) revert SurveyNotFound();
        if (surveys[surveyId].isEnded) revert SurveyAlreadyEnded();
        if (block.timestamp >= surveys[surveyId].endTimestamp) revert SurveyExpired();
        _;
    }

    // ============ Main Functions ============

    /// @notice Create a new survey with on-chain metadata
    /// @param title Survey title (1-200 chars)
    /// @param description Survey description (0-1000 chars)
    /// @param endTimestamp Unix timestamp when survey ends
    /// @param isAnonymous Whether to hide participant addresses
    /// @param questions Array of questions with on-chain text and options
    /// @return surveyId The created survey ID
    function createSurvey(
        string memory title,
        string memory description,
        uint256 endTimestamp,
        bool isAnonymous,
        Question[] memory questions
    ) external returns (uint256 surveyId) {
        // Validation
        if (bytes(title).length == 0 || bytes(title).length > 200) revert EmptyTitle();
        if (questions.length == 0) revert NoQuestions();
        if (questions.length > 20) revert TooManyQuestions();
        if (endTimestamp <= block.timestamp) revert InvalidEndTime();

        surveyId = surveyCount++;

        surveys[surveyId] = Survey({
            creator: msg.sender,
            title: title,
            description: description,
            createdAt: block.timestamp,
            endTimestamp: endTimestamp,
            isAnonymous: isAnonymous,
            isEnded: false,
            responseCount: 0,
            questionCount: uint8(questions.length)
        });

        // Store questions on-chain
        for (uint256 i = 0; i < questions.length; i++) {
            surveyQuestions[surveyId].push(questions[i]);
        }

        emit SurveyCreated(
            surveyId,
            msg.sender,
            title,
            endTimestamp,
            uint8(questions.length)
        );
    }

    /// @notice Submit encrypted answers for all questions
    /// @param surveyId The survey ID
    /// @param encryptedAnswers Array of encrypted answer handles (one per question)
    /// @param inputProof Proof for the encrypted inputs
    function submitAnswers(
        uint256 surveyId,
        externalEuint8[] calldata encryptedAnswers,
        bytes calldata inputProof
    ) external surveyActive(surveyId) {
        require(!hasSubmitted[surveyId][msg.sender], "Already submitted");
        
        Survey storage survey = surveys[surveyId];
        require(encryptedAnswers.length == survey.questionCount, "Answer count mismatch");

        // Mark as submitted
        hasSubmitted[surveyId][msg.sender] = true;

        // Process each answer
        for (uint256 qId = 0; qId < encryptedAnswers.length; qId++) {
            Question storage question = surveyQuestions[surveyId][qId];
            euint8 answer = FHE.fromExternal(encryptedAnswers[qId], inputProof);

            // Store for user to decrypt later
            userAnswers[surveyId][msg.sender][qId] = answer;
            FHE.allow(answer, msg.sender);

            if (question.qType == QuestionType.SingleChoice) {
                _processSingleChoice(surveyId, qId, answer, question.numOptions);
            } else if (question.qType == QuestionType.Rating) {
                _processRating(surveyId, qId, answer);
            } else if (question.qType == QuestionType.YesNo) {
                // Convert euint8 to ebool: >0 = true, 0 = false
                _processYesNo(surveyId, qId, FHE.gt(answer, FHE.asEuint8(0)));
            }
        }

        survey.responseCount++;
        emit SurveySubmitted(surveyId, msg.sender);
    }

    /// @notice End survey early (only creator)
    function endSurvey(uint256 surveyId) external onlyCreator(surveyId) {
        surveys[surveyId].isEnded = true;
        emit SurveyEnded(surveyId);
    }

    // ============ Internal Statistics Processing ============

    function _processSingleChoice(
        uint256 surveyId,
        uint256 qId,
        euint8 answer,
        uint8 numOptions
    ) internal {
        // Accumulate counts for each option using FHE.select
        for (uint8 i = 0; i < numOptions; i++) {
            ebool isMatch = FHE.eq(answer, FHE.asEuint8(i));
            euint32 increment = FHE.select(isMatch, FHE.asEuint32(1), FHE.asEuint32(0));
            
            euint32 currentCount = singleChoiceStats[surveyId][qId][i];
            singleChoiceStats[surveyId][qId][i] = FHE.add(currentCount, increment);
            FHE.allowThis(singleChoiceStats[surveyId][qId][i]);
            FHE.allow(singleChoiceStats[surveyId][qId][i], surveys[surveyId].creator);
        }
    }

    function _processRating(
        uint256 surveyId,
        uint256 qId,
        euint8 rating
    ) internal {
        euint32 ratingAs32 = FHE.asEuint32(rating);
        ratingScores[surveyId][qId].push(ratingAs32);
        FHE.allowThis(ratingAs32);
        FHE.allow(ratingAs32, surveys[surveyId].creator);
    }

    function _processYesNo(
        uint256 surveyId,
        uint256 qId,
        ebool answer
    ) internal {
        euint32 yesIncrement = FHE.select(answer, FHE.asEuint32(1), FHE.asEuint32(0));
        euint32 noIncrement = FHE.select(FHE.not(answer), FHE.asEuint32(1), FHE.asEuint32(0));

        YesNoStats storage stats = yesNoStats[surveyId][qId];
        stats.yesCount = FHE.add(stats.yesCount, yesIncrement);
        stats.noCount = FHE.add(stats.noCount, noIncrement);

        FHE.allowThis(stats.yesCount);
        FHE.allowThis(stats.noCount);
        FHE.allow(stats.yesCount, surveys[surveyId].creator);
        FHE.allow(stats.noCount, surveys[surveyId].creator);
    }

    // ============ View Functions ============

    /// @notice Get survey info
    function getSurvey(uint256 surveyId) external view returns (Survey memory) {
        return surveys[surveyId];
    }

    /// @notice Get all questions for a survey
    function getQuestions(uint256 surveyId) external view returns (Question[] memory) {
        return surveyQuestions[surveyId];
    }

    /// @notice Get single question
    function getQuestion(uint256 surveyId, uint256 qId) external view returns (Question memory) {
        return surveyQuestions[surveyId][qId];
    }

    /// @notice Get rating scores (only creator)
    function getRatingScores(uint256 surveyId, uint256 qId) 
        external 
        view 
        onlyCreator(surveyId) 
        returns (euint32[] memory) 
    {
        return ratingScores[surveyId][qId];
    }

    /// @notice Get user's own answer (encrypted, requires decryption signature)
    function getMyAnswer(uint256 surveyId, uint256 qId) 
        external 
        view 
        returns (euint8) 
    {
        require(hasSubmitted[surveyId][msg.sender], "Not submitted");
        return userAnswers[surveyId][msg.sender][qId];
    }

    /// @notice Get list of surveys created by an address
    function getMySurveys(address creator) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < surveyCount; i++) {
            if (surveys[i].creator == creator) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < surveyCount; i++) {
            if (surveys[i].creator == creator) {
                result[index++] = i;
            }
        }

        return result;
    }
}

