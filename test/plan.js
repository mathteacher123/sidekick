import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { OpenApiToolkit } from "langchain/agents/toolkits";
import { JsonSpec } from "langchain/tools";
import { JsonToolkit, createJsonAgent } from "langchain/agents";
import { MemorySaver } from "@langchain/langgraph";
import readline from "readline";
import { tools, describeTool } from "./tools.js";
import { createModel, loadJSONFile } from "./utils.js";

import "dotenv/config";

import { Annotation } from "@langchain/langgraph";

import { getWPTools } from "./utils.js";
const wpTools = {};
wpTools.tools = await getWPTools();
wpTools.endpoints = await wpTools.tools[2].invoke({});
wpTools.tools.splice(2, 1);
wpTools.desc = wpTools.tools.map((t) => describeTool(t)).join("\n\n");
//console.log(wpTools.tools, wpTools.desc, wpTools.endpoints.substr(0, 100));
//process.exit(0);

const PlanExecuteState = Annotation.Root({
  input: Annotation({
    reducer: (x, y) => y ?? x ?? "",
  }),
  plan: Annotation({
    reducer: (x, y) => y ?? x ?? [],
  }),
  pastSteps: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
  response: Annotation({
    reducer: (x, y) => y ?? x,
  }),
});

const llm = createModel();
const agentExecutor = createReactAgent({
  llm,
  tools: [], //wpTools.tools,
});
let s = "";
/*
let s = await agentExecutor.invoke({
  messages: [new HumanMessage("do nothing")],
});
*/

import { z } from "zod";

const planObject = z.object({
  steps: z
    .array(z.string())
    .describe("different steps to follow, should be in sorted order"),
});

import { ChatPromptTemplate } from "@langchain/core/prompts";

const plannerPrompt = ChatPromptTemplate.fromTemplate(
  `For the given objective (enclosed in """), come up with a simple step by step plan using the tools (wrapped between <<< and >>>) and REST API endpoints (a json string encloded in '''). \
This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps. \
The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.

<<<{desc}>>>

'''{endpoints}''''

"""{objective}"""`
);

const structuredModel = createModel({
  model: "gemini-2.5-flash",
}).withStructuredOutput(planObject);

const planner = plannerPrompt.pipe(structuredModel);

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
      let i = {
        objective: input,
        //"count woocommerce products. if less than 15, add new posts to have 15 wc products",
        // "get site info",
        ...wpTools,
      };
      let s = await planner.invoke(i);
      console.dir(s, { depth: null });
      console.log("--------------");
      promptUser(); // Repeat the loop
    }
  });
}
await promptUser();
/*
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { tool } from "@langchain/core/tools";

const responseObject = z.object({
  response: z.string().describe("Response to user."),
});

const responseTool = tool(() => {}, {
  name: "response",
  description: "Respond to the user.",
  schema: responseObject,
});

const planTool = tool(() => {}, {
  name: "plan",
  description: "This tool is used to plan the steps to follow.",
  schema: planObject,
});

const replannerPrompt = ChatPromptTemplate.fromTemplate(
  `For the given objective, come up with a simple step by step plan. 
This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.
The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.

Your objective was this:
{input}

Your original plan was this:
{plan}

You have currently done the follow steps:
{pastSteps}

Update your plan accordingly. If no more steps are needed and you can return to the user, then respond with that and use the 'response' function.
Otherwise, fill out the plan.  
Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`
);

const parser = new JsonOutputToolsParser();
const replanner = replannerPrompt
  .pipe(createModel().bindTools([planTool, responseTool]))
  .pipe(parser);

import { END, START, StateGraph } from "@langchain/langgraph";

async function executeStep(state, config) {
  const task = state.plan[0];
  const input = {
    messages: [new HumanMessage(task)],
  };
  const { messages } = await agentExecutor.invoke(input, config);

  return {
    pastSteps: [[task, messages[messages.length - 1].content.toString()]],
    plan: state.plan.slice(1),
  };
}

async function planStep(state) {
  const plan = await planner.invoke({ objective: state.input });
  return { plan: plan.steps };
}

async function replanStep(state) {
  const output = await replanner.invoke({
    input: state.input,
    plan: state.plan.join("\n"),
    pastSteps: state.pastSteps
      .map(([step, result]) => `${step}: ${result}`)
      .join("\n"),
  });
  const toolCall = output[0];
  console.log("---re");
  console.dir(output, { depth: null });
  console.dir(toolCall, { depth: null });

  if (toolCall.type == "response") {
    return { response: toolCall.args?.response };
  }

  return { plan: toolCall.args?.steps };
}

function shouldEnd(state) {
  return state.response ? "true" : "false";
}

const workflow = new StateGraph(PlanExecuteState)
  .addNode("planner", planStep)
  .addNode("agent", executeStep)
  .addNode("replan", replanStep)
  .addEdge(START, "planner")
  .addEdge("planner", "agent")
  .addEdge("agent", "replan")
  .addConditionalEdges("replan", shouldEnd, {
    true: END,
    false: "agent",
  });

// Finally, we compile it!
// This compiles it into a LangChain Runnable,
// meaning you can use it as you would any other runnable
const app = workflow.compile();

const config = { recursionLimit: 50 };
const inputs = {
  input: "weight of border collie in sf weather",
};

for await (const event of await app.stream(inputs, config)) {
  console.dir(event, { depth: null });
}
*/
