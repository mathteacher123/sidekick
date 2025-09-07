import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers"
import { tool } from "@langchain/core/tools";
import OpenAPIParser from '@apidevtools/swagger-parser';
import "dotenv/config";
import { createModel, loadJSONFile, extractMinimalSpec, saveFile,loadFile } from "./utils.js";

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

p=PromptTemplate.fromTemplate(pt);
m = createModel({
  model: "gemini-2.0-flash",
});
c=p.pipe(m).pipe(new StringOutputParser());
t=await loadFile('./data/wp-v2-posts.json');
s=await c.invoke({spec:t});
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