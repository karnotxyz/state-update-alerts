import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { PubSub, SNSConfig } from "../types.ts";

/**
 * SNS implementation of the PubSub interface
 */
export class SNSPubSub implements PubSub {
  private snsClient: SNSClient;
  private topicArn: string;

  /**
   * Create a new SNSPubSub instance
   * @param config SNS configuration
   */
  constructor(config: SNSConfig) {
    // Create SNS client with default configuration, only specifying region
    this.snsClient = new SNSClient({
      region: config.region,
      // credentials: {
      //   accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      //   secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      // },
    });

    this.topicArn = config.topicArn;
  }

  /**
   * Publish a message to the SNS topic
   * @param message The message to publish
   * @param subject Optional subject for the SNS message
   */
  public async publish(
    message: string,
    subject?: string,
    chainName?: string,
  ): Promise<void> {
    try {
      const params = {
        Message: message,
        TopicArn: this.topicArn,
        Subject: subject || "State Update Alert",
        MessageAttributes: {
          chain: {
            DataType: "String",
            StringValue: chainName || "Rhino",
          },
        },
      };

      const command = new PublishCommand(params);
      await this.snsClient.send(command);

      console.log(`Published message to SNS topic ${this.topicArn}`);
    } catch (error) {
      console.error("Error publishing to SNS:", error);
      throw error;
    }
  }
}
