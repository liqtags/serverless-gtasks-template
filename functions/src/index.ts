import * as express from "express";
import * as functions from "firebase-functions";
import { CloudTasksClient } from "@google-cloud/tasks";
import * as Shopify from "shopify-api-node";
import * as crypto from "crypto";

const project = "linostasks";
const queue = "gtaskqueue";
const location = "europe-west2";

const shopify = new Shopify({
  shopName: "SOMESTORE.myshopify.com",
  accessToken: "shpat_havefunwiththis",
  timeout: 50000,
});

function verifyWebhook(data: any, hmacHeader: any) {
  const webhookSecret = "some-webhook-secret";
  const calculatedHmac = crypto.createHmac("sha256", webhookSecret).update(data).digest("base64");
  return calculatedHmac == hmacHeader;
}

/**
 * Globals
 */
const app = express();
const client = new CloudTasksClient();

const enqueueTask = async (obj: any) => {
  const parent = client.queuePath(project, location, queue);
  const url = `https://us-central1-linostasks.cloudfunctions.net/app/worker`;
  const task = {
    httpRequest: {
      httpMethod: "POST",
      url,
      body: Buffer.from(JSON.stringify(obj)),
      headers: {
        "Content-Type": "application/json",
      },
    },
  };
  const request = {
    responseView: "FULL",
    parent,
    task,
  };
  // @ts-expect-error - TODO: fix this
  const [response] = await client.createTask(request);
  console.log(`Created task ${response.name}`);
  return response;
};

app.post("/enqueue", async (req, res) => {
  const hmac = req.get("X-Shopify-Hmac-Sha256");
  // @ts-expect-error - this is a valid check
  if (!verifyWebhook(req.rawBody, hmac)) {
    return res.sendStatus(403);
  }

  await enqueueTask(req.body);
  res.send("ok");
});

app.post("/worker", async (req, res) => {
  /**
   * Do some work here on the task
   * You can access the task data via req.body
   */
  return res.send("ok");
});

const appSettings: functions.RuntimeOptions = {
  memory: "128MB",
  timeoutSeconds: 540,
  minInstances: 0,
};

exports.app = functions.runWith({
  ...appSettings,
}).https.onRequest(app);
