import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("SurveyCore", {
    from: deployer,
    args: [],
    log: true,
  });

  console.log(`SurveyCore deployed to: ${deployed.address}`);
};

export default func;
func.id = "deploy_survey_core";
func.tags = ["SurveyCore"];

