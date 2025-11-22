import readline from "readline";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

import {createModel, loadFile} from './utils.js'

const prompt = PromptTemplate.fromTemplate(`
You are a WordPress Admin Assistant that interacts with WordPress via the WordPress REST API.

Your task is to generate a concise, logically ordered, step-by-step plan to accomplish the objective enclosed in triple quotes.

Each step must follow these principles:

- Atomic: Represent a single, discrete action.
- Abstract: Focus on *what* needs to be done, not *how* to do it.
- Sequential: Steps must be ordered to ensure successful execution from start to finish.
- Efficient: Avoid redundant or irrelevant actions.
- Non-generative: Do not create content or perform classification.
- Complete: Include all essential details from the objective that will be needed for execution later. Do not invent or assume any details not explicitly provided.

Objective:
"""{objective}"""
`);

const planObject = z.object({
  steps: z
    .array(z.string())
    .describe("different steps to follow, should be in sorted order"),
});

const structuredModel = createModel({
  model: "gemini-2.0-flash",
  temperature: 0.7,
}).withStructuredOutput(planObject);

const planner = prompt.pipe(structuredModel);


const detailPrompt = PromptTemplate.fromTemplate(`
You are a WordPress Admin Assistant that performs WordPress operations using the WordPress REST API.

You are provided with two inputs:

1. A step-by-step plan to achieve a specific objective, enclosed in triple quotes.
2. A list of available WordPress REST API endpoints, enclosed in triple angle brackets. Each endpoint is a JSON object with the following keys:
   - "route": the API path
   - "method": the HTTP method
   - "description": a brief explanation of what the endpoint does

Example endpoint:
{{
  "route": "/wp/v2/posts",
  "method": "GET",
  "description": "Retrieve list of posts"
}}

Your task is to generate an execution plan for each step in the provided plan.

Instructions:
- For any step that requires a WordPress operation, use only the provided endpoints.
- If a step cannot be executed using the available endpoints, abort the plan and clearly state which step is blocked and why.
- Do not invent or assume any endpoints or functionality beyond what is explicitly provided.
- Do not generate or classify content; focus only on operational execution.
- Include only details from the plan that are necessary for execution. Do not fabricate or infer missing information.
- If multiple steps can be fulfilled by a single API call (e.g., retrieving and filtering posts), consolidate them into one efficient operation—only if the endpoint supports it.

Plan:
"""{plan}"""

Available Endpoints:
<<<{endpoints}>>>
`);

const stepMappingPrompt1 = PromptTemplate.fromTemplate(`
You are given two inputs:

1. A step-by-step plan to accomplish a specific goal, enclosed in triple quotes (""").
2. A list of WordPress REST API endpoints, enclosed in triple angle brackets (<<< >>>). Each endpoint is represented as a JSON object with the following keys:
   - "route": the API path
   - "method": the HTTP method (e.g., GET, POST)
   - "description": a brief explanation of the endpoint's functionality

Example endpoint:
{{
  "route": "/wp/v2/posts",
  "method": "GET",
  "description": "Retrieve list of posts"
}}

Your task:

- Analyze the plan and identify which steps require interaction with WordPress via its REST API.
- For each such step, match it with exactly one endpoint from the provided list that can fulfill the required operation.
- Use only the endpoints listed in the input. Do not assume or invent any additional endpoints.
- If a step requires a WordPress operation but no single endpoint can fulfill it, abort immediately
- Upon aborting, do not attempt to map or process any remaining steps in the plan, even if they appear valid or matchable

Inputs:

"""
{plan}
"""

<<<{endpoints}>>>
`);

const stepMappingPrompt = PromptTemplate.fromTemplate(`
You are given three inputs:

1. A step-by-step plan to achieve a specific goal, enclosed in triple quotes (""").
2. A list of WordPress REST API endpoints, enclosed in triple angle brackets (<<< >>>). Each endpoint is a JSON object with:
   - "route": the API path
   - "method": the HTTP method (e.g., GET, POST)
   - "description": a brief summary of its functionality
3. An OpenAPI specification of the WordPress REST API in JSON format, enclosed in triple pipes (|||).

Example endpoint:
{{
  "route": "/wp/v2/posts",
  "method": "GET",
  "description": "Retrieve list of posts"
}}

Your task:

- Review the plan and identify steps that require interaction with the WordPress REST API.
- For each such step, match it to exactly one endpoint from the provided list that can fulfill the operation.
- Use only the listed endpoints. Do not invent or assume any others.
- If a step requires an operation that no single endpoint can fulfill, abort the plan and explain which step is blocked and why.
- Once an endpoint is matched, use the OpenAPI spec to complete it with query parameters and/or request body so the step can be executed via a REST API call.

Example:

Step: get draft posts  
Matched endpoint:  
{{
  "route": "/wp/v2/posts",
  "method": "GET"
}}

OpenAPI spec:  
"/wp/v2/posts": {{
  "get": {{
    "parameters": [
      {{
        "name": "status",
        "in": "query",
        "description": "Limit result set to posts assigned one or more statuses.",
        "schema": {{
          "default": "publish",
          "items": {{
            "enum": ["publish", "future", "draft"],
            "type": "string"
          }}
        }}
      }}
    ]
  }}
}}

Completed endpoint:  
{{
  "route": "/wp/v2/posts?status=draft",
  "method": "GET",
  "body": null
}}

Inputs:

"""
{plan}
"""

<<<{endpoints}>>>

|||{openapi_spec}|||

`);


const zodSchema= z.array(z.object({
  step: z.string().describe("One Step of the input plan - copy as it is without any change."),
  endpoint: z.union([
  z.object({
    abort: z.boolean().default(true),
  }).describe("Indicates the step requires a WordPress operation but no single endpoint can fulfill it"),
  z.null().describe("Indicates the step does not require a WordPress operation"),

  z.object({
    method: z.string().describe("HTTP method of the matched WordPress endpoint (e.g., GET, POST)"),
    route: z.string().describe("API route of the matched WordPress endpoint (e.g., /wp/v2/posts)")
  }).describe("Details of the WordPress endpoint that fulfills the step")
]).describe("Either null or a WordPress endpoint object")

})).describe("Array of step-to-endpoint mappings");

const stepMappingSchema = z.array(
  //z.record(
      z
        .string()
        .describe("Step description from the plan"),
    /*  z
        .union([
          z
            .null()
            .describe("Indicates the step does not require a WordPress operation"),
          z
            .object({
              method: z
                .string()
                .describe("HTTP method of the matched WordPress endpoint (e.g., GET, POST)"),
              route: z
                .string()
                .describe("API route of the matched WordPress endpoint (e.g., /wp/v2/posts)")
            })
            .describe("Details of the WordPress endpoint that fulfills the step")
        ])
        .describe("Either null or a WordPress endpoint object")
        
    )
    .describe("Mapping of a single step to its corresponding WordPress endpoint or null")
    */
).describe("Array of step-to-endpoint mappings");


const stepMappingModel = createModel({
  model: "gemini-2.5-flash",
  temperature: 0.7,
}).withStructuredOutput(zodSchema);

const stepMapping = stepMappingPrompt.pipe(stepMappingModel);
const t=await loadFile('./data/posts-desc.json');
const oapi =  loadFile('./data/wp-v2-posts.json');

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
    let s2 = await stepMapping.invoke({
      plan:s,
      endpoints:t,
      openapi_spec:oapi
    });
    console.dir(s2, { depth: null });
      console.log("--------------");
      promptUser(); // Repeat the loop
    }
  });
}
await promptUser();
