import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { readFile, writeFile } from "fs/promises";
import { writeFileSync } from "fs";
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

export async function loadFile(path) {
  return await readFile(path, "utf-8");
}
export async function loadJSONFile(path) {
  const jsonString = await readFile(path, "utf-8");
  const data = JSON.parse(jsonString);
  return data;
}

export async function saveFile(filePath, content) {
  //console.log(content);
  try {
    writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (err) {
    throw new Error(`❌ Error saving JSON file: ${err.message}`);
  }
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
 * Extracts a minimal OpenAPI spec for specific endpoints.
 * @param {object} fullSpec - The full OpenAPI spec.
 * @param {Array<{ path: string, method: string[] | null }>} endpoints - Array of endpoint definitions.
 * @returns {object} - A trimmed OpenAPI spec with only the specified endpoints.
 */
export function extractMinimalSpec(fullSpec, endpoints) {
  if (!fullSpec.paths) {
    throw new Error("OpenAPI spec does not contain any paths.");
  }

  const minimalPaths = {};

  for (const { path, method } of endpoints) {
    const pathObj = fullSpec.paths[path];
    if (!pathObj) {
      throw new Error(`Path '${path}' not found in the OpenAPI spec.`);
    }

    if (!method || method.length === 0) {
      // Include the entire path object
      minimalPaths[path] = pathObj;
    } else {
      const extractedMethods = {};
      for (const m of method) {
        const mLower = m.toLowerCase();
        if (!pathObj[mLower]) {
          throw new Error(`Method '${m.toUpperCase()}' not found for path '${path}'.`);
        }
        extractedMethods[mLower] = pathObj[mLower];
      }
      minimalPaths[path] = extractedMethods;
    }
  }

  return {
    openapi: fullSpec.openapi || '3.0.0',
    info: fullSpec.info || {},
    paths: minimalPaths
  };
}

