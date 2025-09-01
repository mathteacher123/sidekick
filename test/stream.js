import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

//require('dotenv').config();
import "dotenv/config";

async function main(){
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.8,
    });
    const stream = await model.stream('how to be good in langchain and langgraph');
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
        console.log(`${chunk.content}|`);
    }
    //console.dir(chunks)
}
main();