import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { readFile } from "fs/promises";
import { OpenApiToolkit } from "langchain/agents/toolkits";
import { JsonSpec } from "langchain/tools";
import { mcploader } from "./mcp.js";

export function createModel(opt = {}) {
  const def = {
    model: "gemini-2.0-flash",
    temperature: 0,
  };
  const opts = {
    ...def,
    ...opt,
  };
  console.log("createModel");
  console.dir(opts);
  return new ChatGoogleGenerativeAI(opts);
}

export async function loadJSONFile(path) {
  const jsonString = await readFile(path, "utf-8");
  const data = JSON.parse(jsonString);
  return data;
}

export async function buildOpenAPIToolkit() {
  const data = await loadJSONFile("./data/wp-v2-bundled.json");
  const model = createModel();
  const toolkit = new OpenApiToolkit(new JsonSpec(data), model);
  return toolkit;
}
export async function getWPTools() {
  const t1 = (await buildOpenAPIToolkit()).getTools();
  const t2 = await mcploader();
  //const endpoints = await t2[2].invoke({});
  t2.splice(3, 1);
  const t3 = [...t2, t1[2]];
  return t3;
}
