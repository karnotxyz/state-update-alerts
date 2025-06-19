import { SNSPubSub } from "./services/pub-sub.ts";
import { CoreContractStatus } from "./services/watcher.ts";
import { Chain } from "./types.ts";

const chains: Chain[] = [
  {
    name: "Rhino",
    coreContractAddress:
      "0x05f838cbcff7340483af90fc839067a95f3066541bdfb39ad47c3c66e4a179ed",
    l2Url: "https://starknet-sepolia.public.blastapi.io",
    l3Url: "https://madara-rhino-l3.karnot.xyz",
    isTestnet: true,
  },
  {
    name: "Starkpay",
    coreContractAddress:
      "0x0035435434bcb6857bce7e1f5565846eed39d945026a93c02a9ac549f205165f",
    l2Url: "https://starknet-sepolia.public.blastapi.io",
    l3Url: "https://madara-starkpay-l3.karnot.xyz",
    isTestnet: true,
  },
  {
    name: "agent-forge",
    coreContractAddress:
      "0x0477f26a3de1f5639f6e377759f34524663da98cf1350904b264f2c15cf376cb",
    l2Url: "https://starknet-sepolia.public.blastapi.io",
    l3Url: "https://madara-agent-forge-l3.karnot.xyz",
    isTestnet: true,
  },
];

async function main() {
  const snsPubSub = new SNSPubSub({
    region: "ap-south-1",
    topicArn: "arn:aws:sns:ap-south-1:025097458243:state-update",
  });

  for (const chain of chains) {
    const coreContractStatus = await CoreContractStatus.getInstance(
      chain.coreContractAddress,
      chain.l2Url,
      chain.l3Url,
      chain.name,
      chain.isTestnet,
      snsPubSub,
    );

    // Every 20 minutes, check if the core contract is not behind by more than 3 hours.
    // coreContractStatus.watch(20 * 60, 4 * 60 * 60);

    // Check only once
    coreContractStatus.checkCore(4 * 60 * 60);
  }
}

main();
