import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { OpenApiToolkit } from "langchain/agents/toolkits";
import { JsonSpec } from "langchain/tools";
import { JsonToolkit, createJsonAgent } from "langchain/agents";

import { readFile } from "fs/promises";
import readline from "readline";

import "dotenv/config";

function createModel(opt = {}) {
  const def = {
    model: "gemini-2.0-flash",
    temperature: 0,
  };
  return new ChatGoogleGenerativeAI({
    ...def,
    ...opt,
  });
}
async function loadJSONFile(path) {
  const jsonString = await readFile(path, "utf-8");
  const data = JSON.parse(jsonString);
  return data;
}

async function buildOpenAPIAgent() {
  const username = "admin";
  const appPassword = "abc123xbMr8 y2kl leGH 9zyz 9Hqf 6zm5yz";
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const headers = {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
  const data = await loadJSONFile("./data/wc-v3.json");
  const model = createModel();
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model, headers);
  const tools = toolkit.getTools();

  console.log(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }))
  );
  return createReactAgent({
    llm: model,
    tools,
    prompt:
      'website url is "http://wps.zya.me" and its rest api url is "http://wps.zya.me/wp-json". for each prompt, examine the openapi spec via json_explorer to find out which api endpoint can serve the request and then call it and then prepare the results',
  });
}
async function buildJsonAgent() {
  const data = await loadJSONFile("./data/wc-v3.json");
  const toolkit = new JsonToolkit(new JsonSpec(data));
  const model = createModel();
  return createJsonAgent(model, toolkit);
}
async function invokeJsonAgent(agent, input) {
  const result = await agent.invoke({ input });
  console.log(`Got output ${result.output}`, result);
  console.log(
    `Got intermediate steps ${JSON.stringify(
      result.intermediateSteps,
      null,
      2
    )}`
  );
}
async function streamAgent(agent, input) {
  const stream = await agent.stream(
    { messages: [["user", input]] },
    { streamMode: "updates" }
  );

  for await (const chunk of stream) {
    for (const [node, values] of Object.entries(chunk)) {
      console.log(`Receiving update from node: ${node}`);
      var msg = values.messages[0];
      if (msg.tool_calls?.length) {
        console.dir(msg.tool_calls);
      } else if (node === "agent") {
        if (msg.content) console.log(msg.content, msg.constructor.name);
        else console.log(msg);
      } else console.log("unknow", msg);
      console.log("\n====\n");
    }
  }
}
const jsonagent = await buildJsonAgent();
const openaapigent = await buildOpenAPIAgent();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptUser() {
  rl.question('Enter prompt (type "q" to quit): ', async (input) => {
    if (input.toLowerCase() === "q") {
      console.log("Sentinel value detected. Exiting loop.");
      rl.close();
    } else {
      console.log(`You entered: ${input}`);
      //await invokeJsonAgent(jsonagent, input);
      await streamAgent(openaapigent, input);
      console.log("--------------");
      promptUser(); // Repeat the loop
    }
  });
}

promptUser();
