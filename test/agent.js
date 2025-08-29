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

import { loadMcpTools, MultiServerMCPClient } from "@langchain/mcp-adapters";
//console.log('token', process.env.WP_MCP_TOKEN)
const client = new MultiServerMCPClient({
   "wordpress-mcp": {
        transport:'http',
        "url": "http://wps.zya.me/wp-json/wp/v2/wpmcp/streamable",
        headers: {
            "Authorization": `Bearer ${process.env.WP_MCP_TOKEN}`
        }
    }
});

const wpTools = await client.getTools();
//console.log(wpTools)
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
    const agentCheckpointer = new MemorySaver();
/*    
    let constr = 'postgresql://postgres:Aaaaaa@0@db.jbksykhhmfmzkpzydpgm.supabase.co:5432/postgres';
    //const agentCheckpointer = PostgresSaver.fromConnString(constr);
    constr = process.env.DATABASE_URL;

    const pool = new Pool({
    connectionString: constr
    });


    const agentCheckpointer = new PostgresSaver(pool);
    //const aa = await agentCheckpointer.setup();
    //console.log('scheam crated', aa)
*/    
    const agent = createReactAgent({
    llm: agentModel,
    tools: wpTools,//agentTools,
    checkpointSaver: agentCheckpointer,
    });
    const config = { configurable: { thread_id: "7" } };

    let inputs = { messages: [{ role: "user",  content: "add a new page. write a 3d game idea and reason why this game will be fun and exciting to play. suggest me a web based 3d game engine for coding. in the end, add your signature so reader will know that this post was written by llm. after adding this page, give me its name, slug and link." }] };


    for await (
        const chunk of await agent.stream(inputs, {
            ...config,
            streamMode: "updates",
        })
    ) {
        for (const [node, values] of Object.entries(chunk)) {
            console.log(`Receiving update from node: ${node}`);
            var msg = values.messages[0];
            if (msg.tool_calls?.length){
                console.log(msg.tool_calls)
            }
            else if (node === 'agent'){
                console.log(msg.content, msg.constructor.name)
            }
            console.log("\n====\n");
        }
    }

/*
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
*/
}
main();