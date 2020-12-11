import { APIGatewayEvent } from "aws-lambda";
import AWS from "aws-sdk";
import qs from "qs";
import axios from "axios";
import middy from "@middy/core";
import doNotWaitForEmptyEventLoop from "@middy/do-not-wait-for-empty-event-loop";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpEventNormalizer from "@middy/http-event-normalizer";
import httpErrorHandler from "@middy/http-error-handler";
import { slackVerifier } from "../../middlewares/slack/verify";

const sqs = new AWS.SQS({ region: "ap-southeast-2" });
const command = async (event: APIGatewayEvent) => {
  if (!event.body) return { statusCode: 200 };
  const requestBody: any = qs.parse(event.body);
  const payload: any = JSON.parse(requestBody.payload);
  let response;

  const action = payload.actions[0];
  if (action.action_id === "sendback") {
    try {
      const sqsPayload = payload.message.blocks.find(
        (block: any) => block.block_id === "payload"
      );
      if (sqsPayload?.text?.text && action?.value) {
        const payload = JSON.parse(sqsPayload.text.text);

        await putBack(payload.jobName, payload.jobData, action.value);

        response = {
          payload: {
            attachments: [
              {
                color: "good",
                text: "Job was sent back",
              },
            ],
            response_type: "in_channel",
          },
        };
      }
    } catch (error) {
      console.error(error);
    }
  }

  if (payload.response_url) {
    await axios({
      method: "post",
      url: payload.response_url,
      data: response.payload,
      headers: {
        "Content-type": "application/json; charset=utf-8",
        Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
      },
    });
  } else if (response && !payload.response_url && response.payload) {
    return {
      body: JSON.stringify(response.payload),
      statusCode: 200,
    };
  } else {
    return {
      statusCode: 200,
    };
  }
};

const putBack = async (name: string, data: any, workerUrl: string) => {
  const params: any = {
    MessageBody: JSON.stringify({ jobName: name, jobData: data }),
    QueueUrl: workerUrl,
  };
  return new Promise((resolve: Function, reject: Function): any => {
    sqs.sendMessage(params, (err: any, data: any): any => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

export const handler = middy(command)
  .use(doNotWaitForEmptyEventLoop())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(slackVerifier())
  .use(httpErrorHandler());
