import * as express from "express";
import * as functions from "firebase-functions";
import { CloudTasksClient } from "@google-cloud/tasks";

const project = "linostasks";
const queue = "gtaskqueue";
const location = "europe-west2";

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
    minInstances: 1,
};

exports.app = functions.runWith({
    ...appSettings,
}).https.onRequest(app);
