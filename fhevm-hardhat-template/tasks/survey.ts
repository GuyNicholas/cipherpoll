import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("survey:create", "Create a new survey")
  .addParam("title", "Survey title")
  .addOptionalParam("description", "Survey description", "")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [signer] = await hre.ethers.getSigners();
    const surveyCore = await hre.ethers.getContract("SurveyCore");

    const endTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // +7 days

    const questions = [
      {
        qType: 0, // SingleChoice
        questionText: "How satisfied are you?",
        options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied"],
        numOptions: 4,
      },
    ];

    console.log("Creating survey:", taskArgs.title);
    const tx = await surveyCore.createSurvey(
      taskArgs.title,
      taskArgs.description,
      endTimestamp,
      true,
      questions
    );
    const receipt = await tx.wait();

    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = surveyCore.interface.parseLog(log);
        return parsed?.name === "SurveyCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = surveyCore.interface.parseLog(event);
      console.log("✅ Survey created! ID:", parsed?.args?.surveyId.toString());
    }
  });

task("survey:submit", "Submit encrypted answers")
  .addParam("id", "Survey ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [signer] = await hre.ethers.getSigners();
    const surveyCore = await hre.ethers.getContract("SurveyCore");
    const contractAddress = await surveyCore.getAddress();

    console.log("Submitting answer to survey", taskArgs.id);

    // Create encrypted input
    const input = await hre.fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .add8(1) // SingleChoice: option 1
      .encrypt();

    const tx = await surveyCore.submitAnswers(
      taskArgs.id,
      [input.handles[0]],
      input.inputProof
    );
    await tx.wait();

    console.log("✅ Answer submitted!");
  });

task("survey:list", "List all surveys").setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const [signer] = await hre.ethers.getSigners();
    const surveyCore = await hre.ethers.getContract("SurveyCore");

    const count = await surveyCore.surveyCount();
    console.log(`Total surveys: ${count}\n`);

    for (let i = 0; i < count; i++) {
      const survey = await surveyCore.getSurvey(i);
      console.log(`Survey #${i}:`);
      console.log(`  Title: ${survey.title}`);
      console.log(`  Creator: ${survey.creator}`);
      console.log(`  Responses: ${survey.responseCount}`);
      console.log(`  Status: ${survey.isEnded ? "Ended" : "Active"}`);
      console.log();
    }
  }
);

task("survey:info", "Get survey info")
  .addParam("id", "Survey ID")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const surveyCore = await hre.ethers.getContract("SurveyCore");

    const survey = await surveyCore.getSurvey(taskArgs.id);
    const questions = await surveyCore.getQuestions(taskArgs.id);

    console.log("\n📋 Survey Information:");
    console.log("Title:", survey.title);
    console.log("Description:", survey.description);
    console.log("Creator:", survey.creator);
    console.log("Responses:", survey.responseCount.toString());
    console.log("Status:", survey.isEnded ? "Ended" : "Active");
    console.log("\n❓ Questions:");
    questions.forEach((q: any, i: number) => {
      console.log(`\nQ${i + 1}: ${q.questionText}`);
      if (q.options.length > 0) {
        q.options.forEach((opt: string, j: number) => {
          console.log(`  ${j}. ${opt}`);
        });
      }
    });
    console.log();
  });

