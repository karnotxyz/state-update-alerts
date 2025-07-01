import { Contract, RpcProvider } from "starknet";
import { SNSPubSub } from "./pub-sub.ts";

function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time * 1000));
}

function formatTimeDifference(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(
      `${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}`,
    );
  }

  return parts.join(", ");
}

export class CoreContractStatus {
  private instance!: CoreContractStatus;
  private coreContract!: Contract;
  private l2Provider!: RpcProvider;
  private l3Provider!: RpcProvider;
  public static pubSub: SNSPubSub;
  private chainName!: string;
  private isTestnet!: boolean;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static async getInstance(
    coreContractAddress: string,
    l2Url: string,
    l3Url: string,
    chainName: string,
    isTestnet: boolean,
    pubSub: SNSPubSub,
  ) {
    const instance = new CoreContractStatus();
    instance.l2Provider = new RpcProvider({ nodeUrl: l2Url });
    instance.l3Provider = new RpcProvider({ nodeUrl: l3Url });

    const cls = await instance.l2Provider.getClassAt(coreContractAddress);
    instance.coreContract = new Contract(
      cls.abi,
      coreContractAddress,
      instance.l2Provider,
    );
    CoreContractStatus.pubSub = pubSub;
    instance.chainName = chainName;
    instance.isTestnet = isTestnet;
    return instance;
  }

  async estimateBlockTime(block_number: number): Promise<number> {
    if (block_number <= 0) {
      return 0;
    }

    // Block timestamp
    const { timestamp: block_timestamp } = await this.l3Provider
      .getBlock(block_number);

    // Prev Block timestamp
    const { timestamp: prev_block_timestamp } = await this.l3Provider.getBlock(
      block_number - 1,
    );

    return block_timestamp - prev_block_timestamp;
  }

  async checkCore(maxWaitTime: number): Promise<boolean> {
    // Call getState on the core contract
    const getStateResult = await this.coreContract.call(
      "get_state",
      [],
    ) as string[];

    // Get the the block till which the chain has settled
    const settledBlock = Number(getStateResult[1]);

    // Get the latest block on chain
    const currentBlock = await this.l3Provider.getBlock("latest");

    // Return early if we have already settled till the latest block
    if (settledBlock == currentBlock.block_number) {
      console.log("Already on Latest, Yayyy !! ");
      return true;
    }

    // Get timestamp at which the block after settlement was created
    const { timestamp: lastSettlementTimestamp } = await this.l3Provider
      .getBlock(settledBlock + 1);

    console.log(currentBlock);

    const currentTimestamp = Date.now() / 1000;
    const timeDiff = Number(currentTimestamp) - Number(lastSettlementTimestamp);
    const contractlink = this.isTestnet
      ? `https://sepolia.voyager.online/contract/${this.coreContract.address}`
      : `https://voyager.online/contract/${this.coreContract.address}`;
    if (currentBlock.block_number > settledBlock && timeDiff > maxWaitTime) {
      const formattedTimeDiff = formatTimeDifference(timeDiff);
      const message =
        `🚨 ALERT: ${this.chainName} Core Contract is experiencing delays\n\n` +
        `Contract Address: ${this.coreContract.address}\n` +
        `Contract Link: ${contractlink}\n` +
        `Last Settlement Block: ${settledBlock}\n` +
        `Current Block: ${currentBlock.block_number}\n` +
        `Delay Duration: ${formattedTimeDiff}\n\n` +
        `The contract has not settled for ${formattedTimeDiff} after the block the block ${
          settledBlock + 1
        } was created, which exceeds the maximum allowed delay of ${
          formatTimeDifference(maxWaitTime)
        }.`;
      console.log("Publishing message", message);

      await CoreContractStatus.pubSub.publish(
        message,
        `🚨 CRITICAL: ${this.chainName} State Update Delayed by ${formattedTimeDiff}`,
        this.chainName,
      );
    }
    return currentBlock.block_number > settledBlock && timeDiff > maxWaitTime;
  }

  public async watch(checkInterval: number, maxWaitTime: number) {
    while (true) {
      await this.checkCore(maxWaitTime);
      await sleep(checkInterval);
    }
  }
}
