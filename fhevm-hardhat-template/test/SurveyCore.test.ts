import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { SurveyCore } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SurveyCore", function () {
  let surveyCore: SurveyCore;
  let owner: HardhatEthersSigner;
  let participant1: HardhatEthersSigner;
  let participant2: HardhatEthersSigner;
  let contractAddress: string;

  before(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    participant1 = signers[1];
    participant2 = signers[2];
  });

  beforeEach(async function () {
    // Check if running on mock environment
    if (!fhevm.isMock) {
      console.warn("This test suite can only run on FHEVM mock environment");
      this.skip();
    }

    const SurveyCoreFactory = await ethers.getContractFactory("SurveyCore");
    surveyCore = await SurveyCoreFactory.deploy();
    await surveyCore.waitForDeployment();

    contractAddress = await surveyCore.getAddress();
  });

  describe("Survey Creation", function () {
    it("Should create a survey with on-chain metadata", async function () {
      const title = "Customer Satisfaction Survey";
      const description = "Help us improve our service";
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400; // +1 day

      const questions = [
        {
          qType: 0, // SingleChoice
          questionText: "How satisfied are you?",
          options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
          numOptions: 4,
        },
        {
          qType: 1, // Rating
          questionText: "Rate our product (1-10)",
          options: [],
          numOptions: 0,
        },
        {
          qType: 2, // YesNo
          questionText: "Would you recommend us?",
          options: [],
          numOptions: 0,
        },
      ];

      const tx = await surveyCore.createSurvey(
        title,
        description,
        endTimestamp,
        true, // isAnonymous
        questions
      );

      await expect(tx)
        .to.emit(surveyCore, "SurveyCreated")
        .withArgs(0, owner.address, title, endTimestamp, 3);

      const survey = await surveyCore.getSurvey(0);
      expect(survey.creator).to.equal(owner.address);
      expect(survey.title).to.equal(title);
      expect(survey.description).to.equal(description);
      expect(survey.questionCount).to.equal(3);
      expect(survey.responseCount).to.equal(0);

      const retrievedQuestions = await surveyCore.getQuestions(0);
      expect(retrievedQuestions.length).to.equal(3);
      expect(retrievedQuestions[0].questionText).to.equal("How satisfied are you?");
      expect(retrievedQuestions[0].options.length).to.equal(4);
    });

    it("Should reject survey with empty title", async function () {
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const questions = [
        {
          qType: 0,
          questionText: "Test?",
          options: ["A", "B"],
          numOptions: 2,
        },
      ];

      await expect(
        surveyCore.createSurvey("", "desc", endTimestamp, true, questions)
      ).to.be.revertedWithCustomError(surveyCore, "EmptyTitle");
    });

    it("Should reject survey with no questions", async function () {
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        surveyCore.createSurvey("Title", "desc", endTimestamp, true, [])
      ).to.be.revertedWithCustomError(surveyCore, "NoQuestions");
    });

    it("Should reject survey with past end time", async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      const questions = [
        {
          qType: 0,
          questionText: "Test?",
          options: ["A", "B"],
          numOptions: 2,
        },
      ];

      await expect(
        surveyCore.createSurvey("Title", "desc", pastTime, true, questions)
      ).to.be.revertedWithCustomError(surveyCore, "InvalidEndTime");
    });
  });

  describe("Answer Submission", function () {
    let surveyId: number;

    beforeEach(async function () {
      const title = "Test Survey";
      const description = "For testing";
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;

      const questions = [
        {
          qType: 0, // SingleChoice
          questionText: "Pick one",
          options: ["A", "B", "C"],
          numOptions: 3,
        },
        {
          qType: 1, // Rating
          questionText: "Rate 1-10",
          options: [],
          numOptions: 0,
        },
        {
          qType: 2, // YesNo
          questionText: "Yes or No?",
          options: [],
          numOptions: 0,
        },
      ];

      const tx = await surveyCore.createSurvey(
        title,
        description,
        endTimestamp,
        true,
        questions
      );
      await tx.wait();
      surveyId = 0; // First survey
    });

    it("Should submit encrypted answers", async function () {
      // Create encrypted input for all three answers
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, participant1.address)
        .add8(1) // SingleChoice: option 1 (B)
        .add8(8) // Rating: 8/10
        .add8(1) // YesNo: true (>0)
        .encrypt();

      const tx = await surveyCore.connect(participant1).submitAnswers(
        surveyId,
        [
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
        ],
        encryptedInput.inputProof
      );

      await expect(tx)
        .to.emit(surveyCore, "SurveySubmitted")
        .withArgs(surveyId, participant1.address);

      const survey = await surveyCore.getSurvey(surveyId);
      expect(survey.responseCount).to.equal(1);
    });

    it("Should prevent duplicate submissions", async function () {
      // First submission
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, participant1.address)
        .add8(0)
        .add8(5)
        .add8(1)
        .encrypt();

      await surveyCore.connect(participant1).submitAnswers(
        surveyId,
        [encrypted1.handles[0], encrypted1.handles[1], encrypted1.handles[2]],
        encrypted1.inputProof
      );

      // Second submission should fail
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, participant1.address)
        .add8(1)
        .add8(7)
        .add8(0)
        .encrypt();

      await expect(
        surveyCore.connect(participant1).submitAnswers(
          surveyId,
          [encrypted2.handles[0], encrypted2.handles[1], encrypted2.handles[2]],
          encrypted2.inputProof
        )
      ).to.be.revertedWith("Already submitted");
    });

    it("Should allow multiple participants", async function () {
      // Participant 1
      const encrypted1 = await fhevm
        .createEncryptedInput(contractAddress, participant1.address)
        .add8(0)
        .add8(7)
        .add8(1)
        .encrypt();

      await surveyCore.connect(participant1).submitAnswers(
        surveyId,
        [encrypted1.handles[0], encrypted1.handles[1], encrypted1.handles[2]],
        encrypted1.inputProof
      );

      // Participant 2
      const encrypted2 = await fhevm
        .createEncryptedInput(contractAddress, participant2.address)
        .add8(2)
        .add8(9)
        .add8(0)
        .encrypt();

      await surveyCore.connect(participant2).submitAnswers(
        surveyId,
        [encrypted2.handles[0], encrypted2.handles[1], encrypted2.handles[2]],
        encrypted2.inputProof
      );

      const survey = await surveyCore.getSurvey(surveyId);
      expect(survey.responseCount).to.equal(2);
    });
  });

  describe("Survey Management", function () {
    it("Should allow creator to end survey early", async function () {
      const title = "Test Survey";
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const questions = [
        {
          qType: 0,
          questionText: "Test?",
          options: ["A", "B"],
          numOptions: 2,
        },
      ];

      const tx = await surveyCore.createSurvey(title, "desc", endTimestamp, true, questions);
      await tx.wait();

      const surveyId = 0;
      await expect(surveyCore.endSurvey(surveyId))
        .to.emit(surveyCore, "SurveyEnded")
        .withArgs(surveyId);

      const survey = await surveyCore.getSurvey(surveyId);
      expect(survey.isEnded).to.be.true;
    });

    it("Should prevent non-creator from ending survey", async function () {
      const title = "Test Survey";
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const questions = [
        {
          qType: 0,
          questionText: "Test?",
          options: ["A", "B"],
          numOptions: 2,
        },
      ];

      await surveyCore.createSurvey(title, "desc", endTimestamp, true, questions);
      const surveyId = 0;

      await expect(
        surveyCore.connect(participant1).endSurvey(surveyId)
      ).to.be.revertedWithCustomError(surveyCore, "NotCreator");
    });
  });

  describe("View Functions", function () {
    it("Should return user's surveys", async function () {
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const questions = [
        {
          qType: 0,
          questionText: "Test?",
          options: ["A", "B"],
          numOptions: 2,
        },
      ];

      // Create 2 surveys as owner
      await surveyCore.createSurvey("Survey 1", "desc", endTimestamp, true, questions);
      await surveyCore.createSurvey("Survey 2", "desc", endTimestamp, true, questions);

      // Create 1 survey as participant1
      await surveyCore.connect(participant1).createSurvey("Survey 3", "desc", endTimestamp, true, questions);

      const ownerSurveys = await surveyCore.getMySurveys(owner.address);
      expect(ownerSurveys.length).to.equal(2);

      const participant1Surveys = await surveyCore.getMySurveys(participant1.address);
      expect(participant1Surveys.length).to.equal(1);
    });

    it("Should retrieve specific question", async function () {
      const endTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const questions = [
        {
          qType: 0,
          questionText: "First question?",
          options: ["A", "B", "C"],
          numOptions: 3,
        },
        {
          qType: 1,
          questionText: "Second question?",
          options: [],
          numOptions: 0,
        },
      ];

      await surveyCore.createSurvey("Survey", "desc", endTimestamp, true, questions);

      const question0 = await surveyCore.getQuestion(0, 0);
      expect(question0.questionText).to.equal("First question?");
      expect(question0.qType).to.equal(0);
      expect(question0.numOptions).to.equal(3);

      const question1 = await surveyCore.getQuestion(0, 1);
      expect(question1.questionText).to.equal("Second question?");
      expect(question1.qType).to.equal(1);
    });
  });
});
