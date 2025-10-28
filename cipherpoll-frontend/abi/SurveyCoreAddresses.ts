// Auto-generated file - DO NOT EDIT
// Contract addresses for SurveyCore

export const SurveyCoreAddresses: Record<number, string> = {
  31337: "0xD994f0E33b3c8A595Cc8B575b348B7e539a15AEa", // localhost
  11155111: "0xb1CfD5Db65c0B4C5F706D67136d0F26f8786F050", // sepolia
} as const;

export function getSurveyCoreAddress(chainId: number): string | undefined {
  return SurveyCoreAddresses[chainId];
}
