import readline from "readline";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

import {createModel, loadFile} from './utils.js'

const prompt = PromptTemplate.fromTemplate(`
You are a highly skilled WordPress and WooCommerce developer with the following expertise:

- Deep mastery of WordPress core architecture and source code.
- Extensive experience building hundreds of custom plugins and themes.
- Advanced proficiency in Gutenberg block development.
- Expert-level knowledge of WooCommerce blocks and the Store API.
- Thorough understanding of the WordPress and WooCommerce REST API.
- You consistently provide optimal, technically sound answers to WordPress-related questions.

Your Task:
Given a specific objective, generate a concise and actionable step-by-step plan to achieve it. Each step should be:

- Singular in purpose and logically sequenced.
- Fully self-contained with all necessary details.
- Free of unnecessary or redundant actions.
- Designed to produce the final answer upon completion of the last step.

For each step:
- Assess whether it requires a WordPress operation.
- If so, find the WordPress REST API to perform the operation whenever feasible.
- If the operation cannot be performed via the REST API, explicitly state that.

Objective:
"""{objective}"""
`);

const apiSchema = z.object({
  path: z.string().describe("Endpoint path with query parameters, e.g., /wp/posts, /wp/users?slug=admin"),
  method: z.string().describe("HTTP method, e.g., GET, POST, DELETE, PATCH"),
  body: z.discriminatedUnion("contentType", [
    z.object({
      contentType: z.literal("application/json"),
      value: z.record(z.any()),
    }),
    z.object({
      contentType: z.literal("multipart/form-data"),
      value: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    }),
    z.object({
      contentType: z.literal("application/x-www-form-urlencoded"),
      value: z.string(),
    }),
  ]).nullable().describe("Request body based on content type; can be null"),
  responses: z.object({
    status: z.string().describe("HTTP status code, e.g., 200"),
    value: z.record(z.any()).describe("Response content as defined in WordPress REST API OpenAPI spec")
  }).nullable().describe("Expected responses for the endpoint"),
  exampleResponse: z.string().describe("Example JSON response from executing the API request")
});

const planSchema = z.object({
  steps: z.array(z.object({
    desc: z.string().describe("Intent of the step, e.g., fetch post"),
    apiCall: z.object({
  path: z.string().describe("Endpoint path with query parameters, e.g., /wp/posts, /wp/users?slug=admin"),
  method: z.string().describe("HTTP method, e.g., GET, POST, DELETE, PATCH"),
  body:z.record(z.string()).describe("Request body based on content type; can be null")
}).describe("API call used to perform the step"),
    //apiResponse: z.array(z.string()).describe("Expected response(s) from the API call")
  }).describe("Details of each step"))
}).describe("Structured plan with executable steps");

const structuredModel = createModel({
  model: "gemini-2.5-flash",
  temperature: 0.7,
}).withStructuredOutput(planSchema);

const planner = prompt.pipe(structuredModel);

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
      let s = await planner.invoke({
        objective: input
      });
        console.dir(s, { depth: null });
        console.log("--------------");
        promptUser(); // Repeat the loop
    }
  });
}
await promptUser();

