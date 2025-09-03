import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { OpenApiToolkit } from "langchain/agents/toolkits";
import { JsonSpec } from "langchain/tools";
import { JsonToolkit, createJsonAgent } from "langchain/agents";
import { MemorySaver } from "@langchain/langgraph";
import readline from "readline";

import "dotenv/config";

import { mcploader } from "./mcp.js";
import { reactagentprompt, reactagentprompt2, hwreact } from "./prompt.js";
import { tools, describeTool } from "./tools.js";
import { createModel, loadJSONFile } from "./utils.js";

async function buildOpenAPIToolkit() {
  const username = "admin";
  const appPassword = "bMr8 y2kl leGH 9zyz 9Hqf 6zm5";
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const headers = {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  };
  const data = await loadJSONFile("./data/wp-v2-bundled.json");
  const model = createModel();
  //headers are optional - just to make request
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model);
  const tools = toolkit.getTools();

  console.log(
    tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }))
  );
  return toolkit;
}
async function buildOpenAPIAgent() {
  return createReactAgent({
    llm: createModel(),
    tools: (await buildOpenAPIToolkit()).getTools(),
    prompt:
      'website url is "http://wps.zya.me" and its rest api url is "http://wps.zya.me/wp-json". for each prompt, examine the openapi spec via json_explorer to find out which api endpoint can serve the request and then call it and then prepare the results',
  });
}
async function buildMixAgent() {
  const t1 = (await buildOpenAPIToolkit()).getTools();
  const t2 = await mcploader();
  const endpoints = await t2[2].invoke({});
  t2.splice(2, 2);
  const t3 = [...t2];
  const prompt = await PromptTemplate.fromTemplate(reactagentprompt2).format({
    rest_api_endpoints: endpoints,
  });
  console.log(prompt);
  //mis: createReactAgent make fake Observation whtn hwreact prompt is used as sys prompt.

  const checkpointer = new MemorySaver();
  const agent = createReactAgent({
    llm: createModel({
      model: "gemini-2.0-flash",
    }),
    tools: t3,
    checkpointer,
  });
  return [agent, prompt];
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
    { streamMode: "values", ...config }
  );

  for await (const chunk of stream) {
    for (const [node, values] of Object.entries(chunk)) {
      console.log(`Receiving update from node: ${node}`);
      console.dir(values);
      console.log(">>>>");
      continue;
      var msg = values.messages[0];
      if (msg.tool_calls?.length) {
        console.dir(msg.tool_calls);
        console.dir("body", msg.tool_calls.args?.data);
      } else if (node === "agent") {
        if (msg.content) console.log(msg.content, msg.constructor.name);
        else console.log(msg);
      } else console.log("unknow", msg.content.substr(0, 300));
      console.log("\n====\n");
    }
  }
}
//const jsonagent = await buildJsonAgent();
//const openaapigent = await buildOpenAPIAgent();
const mixagent = await buildMixAgent();
const config = { configurable: { thread_id: "1" } };
const state = await mixagent[0].invoke(
  {
    messages: [
      ["system", mixagent[1]],
      ["user", "list woocommerce products"],
    ],
  },
  {
    ...config,
  }
);
console.log("state");
console.dir(state);
process.exit(0);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//const toolkit = await buildOpenAPIToolkit();
var json_explorer; // = toolkit.getTools()[2];
async function promptUser() {
  rl.question('Enter prompt (type "q" to quit): ', async (input) => {
    if (input.toLowerCase() === "q") {
      console.log("Sentinel value detected. Exiting loop.");
      rl.close();
    } else {
      console.log(`You entered: ${input}`);
      //await invokeJsonAgent(jsonagent, input);
      await streamAgent(mixagent, input);
      //const ret = await json_explorer.invoke({ input });
      //console.log(ret);
      console.log("--------------");
      promptUser(); // Repeat the loop
    }
  });
}

async function promptUser1() {
  console.log("going to ask question. do be shy........");
  rl.question('Enter prompt (type "exit" to quit): ', async (input) => {
    if (input.toLowerCase() === "q") {
      console.log("Sentinel value detected. Exiting loop.");
      rl.close();
    } else {
      console.log(`You entered: ${input}`);
      promptUser1(); // Repeat the loop
    }
  });
}

await promptUser();
