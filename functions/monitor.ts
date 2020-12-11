import middy from "@middy/core";
import axios from "axios";
import doNotWaitForEmptyEventLoop from "@middy/do-not-wait-for-empty-event-loop";
export const monitor = async (event: any): Promise<any> => {
  const records = event.Records;
  await Promise.all(
    records.map((record: any) => {
      const messageGroupId = record?.attributes?.MessageGroupId;
      const messageDeduplicationId = record?.attributes?.MessageDeduplicationId;
      const approximateReceiveCount =
        record?.attributes?.ApproximateReceiveCount;

      return axios({
        method: "post",
        url: process.env.SLACK_ENDPOINT,
        data: {
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Messsge ID*: ${record.messageId}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Message Group Id*: ${messageGroupId}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Message Deduplication Id*: ${messageDeduplicationId}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Approximate Receive Count*: ${approximateReceiveCount}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: record.body,
              },
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  style: "primary",
                  text: {
                    type: "plain_text",
                    text: "Send back",
                  },
                  action_id: "sendback",
                  value: record.body,
                },
              ],
            },
          ],
        },
        headers: {
          "Content-type": "application/json; charset=utf-8",
        },
      });
    })
  );
  return;
};

export const salesforceDeadLetterMonitor = middy(monitor).use(
  doNotWaitForEmptyEventLoop()
);
