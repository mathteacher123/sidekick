import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
//const { Pool } = require('pg');
import {Pool} from "pg";

import { z } from "zod";
import { tool } from "@langchain/core/tools";
//require('dotenv').config();
import 'dotenv/config';


const getWeather = tool(async (input) => {
const input1 = input;
  if (input1.city === "nyc") {
    return "It might be cloudy in nyc";
  } else if (input1.city === "sf") {
    return "It's always sunny in sf";
  } else {
    throw new Error("Unknown city");
  }
}, {
  name: "get_weather",
  description: "Use this to get weather information.",
  schema: z.object({
    city: z.enum(["sf", "nyc"])
  }),
});

async function main(){

    const agentTools = [getWeather];
    const agentModel = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0,
    });

    // Initialize memory to persist state between graph runs
    //const agentCheckpointer = new MemorySaver();
    let constr = 'postgresql://postgres:Aaaaaa@0@db.jbksykhhmfmzkpzydpgm.supabase.co:5432/postgres';
    //const agentCheckpointer = PostgresSaver.fromConnString(constr);
    constr = process.env.DATABASE_URL;

    const pool = new Pool({
    connectionString: constr
    });


    const agentCheckpointer = new PostgresSaver(pool);
    //const aa = await agentCheckpointer.setup();
    //console.log('scheam crated', aa)
    const agent = createReactAgent({
    llm: agentModel,
    tools: agentTools,
    checkpointSaver: agentCheckpointer,
    });
    const config = { configurable: { thread_id: "7" } };
    // Now it's time to use!
    const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage("what is the current weather in sf")] },
    config,
    );

    console.log(
    agentFinalState.messages[agentFinalState.messages.length - 1].content,
    );

    const agentNextState = await agent.invoke(
    { messages: [new HumanMessage("what about ny")] },
    config,
    );

    console.log(
    agentNextState.messages[agentNextState.messages.length - 1].content,
    );
    console.log('checkpointer state', await agentCheckpointer.get(config));

}
main();