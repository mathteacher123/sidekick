import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers"
import { tool } from "@langchain/core/tools";
import OpenAPIParser from '@apidevtools/swagger-parser';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import "dotenv/config";
import { createModel, loadJSONFile, extractMinimalSpec, saveFile,loadFile, callWpApi } from "./utils.js";
//import { createReactAgent } from "langchain/agents";
import { tools } from "./tools.js";
import {ppt1,ppt2} from './p.js'

let s,m,p,c,t,pt;

p=PromptTemplate.fromTemplate('given the openapi spec <<<{spec}>>> of an endpoint, code an http request to https://a.co using curl. use only required fields. just return the curl statement');
p=PromptTemplate.fromTemplate('given the endpoints <<<{spec}>>> of an endpoint, code an http request to https://a.co using curl. use only required fields. just return the curl statement');
pt=`
only use these endpoints <<<{spec}>>> (given as openapi spec) to fulfill below tasks.
do not make up the endpoints yourself - just use the provided endpoints.

tasks:
1. get a post that has id#111
2. add a new post. use id of admin user as post author. use title='hello', content='xyz'
3. get list of active plugins.

output: return one of the below two lines:
1 - a list of endpoints path and http method along wtih request body if all tasks can be fulfilled with the given endpoints
2 - "your tasks can not be fulfilled"
`;
pt = `
you are given a list of endpoints (route, method, description) in json format: <<<{json}>> and a list of tasks (given below)
tell me which endpoints (multiple endpoints may be needed to perform a task) will be needed to perform each task. output only route and method for each endpoint. output endpoints of a task in the following format: [{{route:route,method:method}}]
if a task can not be accomplished using the provided endpoints, say so.

tasks:
1. get a post that has id#111
2. add a new post. use id of admin user as post author. use title='hello', content='xyz'
3. get list of active plugins.
4. get admin user.
5. delete two posts - id#123 and id#234 and then list all posts and the add a new post with title:abc and content:hello.
`;

pt = `
You are an API expert. Based on the user’s intent, return the correct API endpoint(s) from the "API Endpoints" below.

Each endpoint has a "route", "method", and "description".

Respond with one or more matching endpoints in the following JSON array format:

\`\`\`json
[
  {{ "route": "/example", "method": "GET" }},
  {{ "route": "/example", "method": "POST" }}
]



If **no endpoint matches** the user's request, respond with json: {{ "route": null, "method": null }}

### API Endpoints:
<<<{endpoints}>>>

### User Request:
{input}

### Response:
`;
pt = `
You have following tools:

get_site_info: return the information about site - e.g. installed plugins, themes, settings etc. takes no input.
get_openapi_spec: given an endpoint (route and http method) of wp rest api, returns the json schema for the request body of that endpoint
run_api: given a wp rest api request, execute it and returns the results

you also have a list of endpoints in json format - each endpoint has a "route", "http method" and "description".
\`\`\`json{endpoints}

Given a user intent, you strictly follow below steps in order:
1 - check if a tool can be used. If yes, you use it and skip the remaining steps.
2 - break the user intent in parts. find endpoint for each part. and then:
2a - use get_openapi_spec to get request and response format
2b - call run_api tool with endpoint

you output a list of tools calls in json format: [{{"toolname":toolname,"args": args}}]
toolname is the name of one of the 3 tools (describe above) and args is the input of each tool.
`;
const get_site_info = tool(
  async () => {
    return JSON.stringify({plugins:[{name:'a1'},{name:"b1"}]});
  },
  {
    name: "get_site_info",
    description: "return the information about site - e.g. installed plugins, themes, settings etc. takes no input.",
    schema: z.object({}),
  }
);
const get_openapi_spec = tool(
  async ({route,method}) => {
    const json = await loadJSONFile('./data/wp-v2-posts.json');
    return json.paths[route][method];
  },
  {
    name: "get_openapi_spec",
    description: "given an endpoint (route and http method) of wp rest api, returns the json schema for the request body an query string paramters of that endpoint",
    schema:z.object({
          route: z.string().describe('route of wp rest api endpoint'),
          method: z.string().describe('http method (get,post, put etc) of wp rest api endpint'),
        })
  }
);
const run_api = tool(
  async () => {
    return '1234'
  },
  {
    name: "run_api",
    description: "given a wp rest api request, execute it and returns the results",
    schema: z.object({
      route: z.string().describe('route'),
      method: z.string().describe('method'),
      data: z.string().describe('json string')
    })
  }
);
const llm = tool(
  async ({query}) => {
    return createModel().pipe(new StringOutputParser()).invoke(query);
  },
  {
    name: "llm",
    description: "generates a response directly using the LLM.",
    schema: z.object({
      query: z.string().describe('query for llm'),
    })
  }
);
p=PromptTemplate.fromTemplate(ppt2);
m = createModel({
  model: "gemini-2.0-flash",
});
t=await loadFile('./data/posts-desc.json');
var aaa =  createReactAgent({
  llm:m,
  tools:[get_site_info, run_api, get_openapi_spec, llm],
  prompt:await p.format({endpoints:t}),
});
s=await aaa.invoke({
  //messages:[['user','get names of all active plugins. create a post then get all published posts and then update the newly created post from publish to draft.']]
  //messages:[['user','where can i find freelancer wordpress jobs - other than upwork, freelancer.com']]
  messages:[['user','get a list of all draft posts']]
});
for(var x of s.messages){
  console.log(x.constructor.name)
  if (x?.tool_calls && x.tool_calls.length) console.dir(x.tool_calls, {depth:null})
  else console.log(x.content)
  console.log('--------')
}

process.exit(0);

c=p.pipe(m).pipe(new StringOutputParser());
t=await loadFile('./data/posts-desc.json');
s=await c.invoke({input:'get most recent post', endpoints: t});
//console.dir(t, {depth:null});
console.log('---');
console.dir(s);
process.exit(0)

const responseObject = z.object({
  iuy: z.string().describe("Response to user."),
});
const responseTool = tool(() => {
  console.log('tool called')
}, {
  name: "response123",
  description: "Respond to the user.",
  schema: responseObject,
});
const log=(x)=>{
  console.dir('log')
  console.dir(x, {depth:null})
  return  x;
}
const parser = new JsonOutputToolsParser();
const replanner =
    createModel().bindTools([
      responseTool,
    ])
  .pipe(log)
  .pipe(parser);
s=await replanner.invoke(['user',"reply to user, 'byyyy'"]);
console.dir(s, {depth:null})
process.exit(0)


const mySchema = z
  .object({
    myString: z.string().min(5),
    myUnion: z.union([z.number(), z.boolean()]),
  })
  .describe("My neat object schema");

const jsonSchema = zodToJsonSchema(mySchema, "mySchema");
console.dir(jsonSchema);

const a = z.object({
  city: z.enum(["sf", "nyc"]),
});
console.dir(JSON.stringify(zodToJsonSchema(a, "mySchema")));

process.exit(0);

const dereferenced1 = await OpenAPIParser.dereference('./data/wp-v2.json');
t=extractMinimalSpec(dereferenced1, [
  {path:"/wp/v2/posts", method:['post']},
  {path:"/wp/v2/posts/{id}", method:['get']},
]);
t=JSON.stringify(t,null,2);
saveFile("./data/wp-v2-posts.json",t);
process.exit(0);