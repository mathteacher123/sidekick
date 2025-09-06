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

/**
 * Extracts a minimal OpenAPI spec for a specific endpoint.
 * @param {object} fullSpec - The full OpenAPI spec.
 * @param {string} path - The endpoint path (e.g., "/users/{id}").
 * @param {string} method - The HTTP method (e.g., "get", "post").
 * @returns {object} - A trimmed OpenAPI spec with only the specified endpoint.
 */
export function extractMinimalSpec(fullSpec, path, method) {
  const methodLower = method.toLowerCase();

  if (
    !fullSpec.paths ||
    !fullSpec.paths[path] ||
    !fullSpec.paths[path][methodLower]
  ) {
    throw new Error(`Endpoint ${method.toUpperCase()} ${path} not found.`);
  }

  return {
    openapi: fullSpec.openapi || '3.0.0',
    info: fullSpec.info || {},
    //servers: fullSpec.servers || [],
    //tags: fullSpec.tags || [],
    paths: {
      [path]: {
        [methodLower]: fullSpec.paths[path][methodLower]
      }
    }
  };
}
