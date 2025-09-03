import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { readFile } from "fs/promises";

export function createModel(opt = {}) {
  const def = {
    model: "gemini-2.0-flash",
    temperature: 0,
  };
  return new ChatGoogleGenerativeAI({
    ...def,
    ...opt,
  });
}

export async function loadJSONFile(path) {
  const jsonString = await readFile(path, "utf-8");
  const data = JSON.parse(jsonString);
  return data;
}
