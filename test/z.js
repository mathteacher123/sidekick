import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { tool } from "@langchain/core/tools";
import { createModel, loadJSONFile } from "./utils.js";
import "dotenv/config";
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
let s=await replanner.invoke(['user',"reply to user, 'byyyy'"]);
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
