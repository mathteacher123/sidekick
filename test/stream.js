import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { JsonOutputParser } from "@langchain/core/output_parsers";
//require('dotenv').config();
import "dotenv/config";

const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.8,
});
async function llm(){
    const stream = await model.stream('max 5 lines about inding a painkiller idea');
    const chunks = [];
    let final=null;
    for await (const chunk of stream) {
        chunks.push(chunk);
        final = final?final.concat(chunk):chunk;
        console.log(`${chunk.content}|`);
    }
    console.dir(final)
}
// A function that does not operates on input streams and breaks streaming.
const extractCountryNames = (inputs) => {
  if (!Array.isArray(inputs.countries)) {
    return "";
  }
  return JSON.stringify(inputs.countries.map((country) => country.name));
};
async function chain(){
    const chain = model.pipe(new JsonOutputParser()).pipe(extractCountryNames);;
    const stream = await chain.stream(
    `Output a list of the countries france, spain and japan and their populations in JSON format. Use a dict with an outer key of "countries" which contains a list of countries. Each country should have the key "name" and "population"`
    );

    for await (const chunk of stream) {
        console.dir(chunk);
    }
}
chain();