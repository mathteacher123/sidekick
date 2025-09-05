import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";

import {createModel} from "./utils.js";

const model = createModel();
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

async function events(){
    const chain = model.withConfig({'runName':'mmm'}).pipe(new JsonOutputParser().withConfig({runName:'ppp'})).withConfig({tags:'abc'}).pipe(extractCountryNames);
    const stream = await chain.streamEvents(
    `Output a list of the countries france, spain and japan and their populations in JSON format. Use a dict with an outer key of "countries" which contains a list of countries. Each country should have the key "name" and "population"`,
    {version:'v2'},
    {includeNames:['mmm']}
    );

    for await (const chunk of stream) {
        if ('on_chat_model_stream'===chunk.event) {
          console.log(chunk.data.chunk.content)
          
        }
        else{
          console.log(chunk)
        }
        //console.dir(chunk);
    }
}
events();