/**
 * SNS configuration options
 */
export interface SNSConfig {
  // AWS region
  region: string;
  // SNS topic ARN
  topicArn: string;
}

/**
 * PubSub interface for publishing messages
 */
export interface PubSub {
  /**
   * Publish a message to the pub/sub system
   * @param message The message to publish
   * @param subject Optional subject/title for the message
   * @returns Promise that resolves when the message is published
   */
  publish(message: string, subject?: string, chainName?: string): Promise<void>;
}

/**
 * An L3 Chain interface
 */
export interface Chain {
  // The name of the chain
  name: string;
  // The address of the core contract
  coreContractAddress: string;
  // The URL of the L2 provider
  l2Url: string;
  // The URL of the L3 provider
  l3Url: string;

  // testnet or mainnet
  isTestnet: boolean;
}
