import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers"
import { tool } from "@langchain/core/tools";
import { createModel, loadJSONFile, extractMinimalSpec } from "./utils.js";
import "dotenv/config";
import OpenAPIParser from '@apidevtools/swagger-parser';

let s,m,p,c,t;
p=PromptTemplate.fromTemplate('given openapi spec <<<{spec}>>> of an endpoint, code an http request to https://a.co using curl. use only required fields. just return the curl statement');
m = createModel();
c=p.pipe(m).pipe(new StringOutputParser());
const dereferenced = await OpenAPIParser.dereference('./data/wp-v2.json');
t=extractMinimalSpec(dereferenced, "/wp/v2/posts", 'post');
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
