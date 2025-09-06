import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { OpenApiToolkit } from "langchain/agents/toolkits";
import { JsonSpec } from "langchain/tools";
import { JsonToolkit, createJsonAgent } from "langchain/agents";
import { MemorySaver } from "@langchain/langgraph";
import readline from "readline";
import { Annotation } from "@langchain/langgraph";
import { renderTextDescriptionAndArgs } from "langchain/tools/render";
import "dotenv/config";

import { tools, describeTool } from "./tools.js";
import { createModel, getWPTools, buildOpenAPIToolkit } from "./utils.js";


const renderedTools = renderTextDescriptionAndArgs([tools[1]]);
//console.log(renderedTools);

const tk = await buildOpenAPIToolkit();
const a1 = createReactAgent({
  llm: createModel({
    model: "gemini-2.0-flash",
  }),
  tools: [tk.getTools()[2]],
  prompt: 'always get the request and response fromats of an endpoint'
});


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
async function promptUser1() {
  rl.question('Enter prompt (type "q" to quit): ', async (input) => {
    if (input.toLowerCase() === "q") {
      console.log("Sentinel value detected. Exiting loop.");
      rl.close();
    } else {
      console.log(`You entered: ${input}`);
      let i={messages:[['user', input]]};
let s=await a1.invoke(i)
console.log(s)

      console.log("--------------");
      promptUser1(); // Repeat the loop
    }
  });
}
await promptUser1();


