import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
//const { Pool } = require('pg');
import { Pool } from "pg";

import { z } from "zod";
import { tool } from "@langchain/core/tools";
//require('dotenv').config();
import "dotenv/config";

import { loadMcpTools, MultiServerMCPClient } from "@langchain/mcp-adapters";
import { systemPrompt } from "./prompt.js";

const client = new MultiServerMCPClient({
  "wordpress-mcp": {
    transport: "http",
    url: "http://wps.zya.me/wp-json/wp/v2/wpmcp/streamable",
    headers: {
      Authorization: `Bearer ${process.env.WP_MCP_TOKEN}`,
    },
  },
});

const wpTools = await client.getTools();
//console.log(wpTools)
const calculate = tool(
  async (input) => {
    return eval(input);
  },
  {
    name: "calculate",
    description: "Runs a calculation and returns the number.",
    schema: z.object({
      input: z.string(),
    }),
  }
);
const average_dog_weight = tool(
  async (input) => {
    if (input === "Scottish Terrier") {
      return "Scottish Terriers average 20 lbs";
    } else if (input === "Border Collie") {
      return "a Border Collies average weight is 37 lbs";
    } else {
      return "An average dog weights 50 lbs";
    }
  },
  {
    name: "average_dog_weight",
    description: "returns average weight of a dog when given the breed",
    schema: z.object({
      input: z.string(),
    }),
  }
);
const getWeather = tool(
  async (input) => {
    const input1 = input;
    if (input1.city === "nyc") {
      return "It might be cloudy in nyc";
    } else if (input1.city === "sf") {
      return "It's always sunny in sf";
    } else {
      throw new Error("Unknown city");
    }
  },
  {
    name: "get_weather",
    description: "Use this to get weather information.",
    schema: z.object({
      city: z.enum(["sf", "nyc"]),
    }),
  }
);

async function main() {
  const agentTools = [getWeather];
  const agentModel = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
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
    tools: [calculate, average_dog_weight, getWeather], //wpTools, //agentTools,
    checkpointSaver: agentCheckpointer,
    prompt: systemPrompt,
  });
  return agent;
  /*    
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

import readline from "readline";
const agent = await main();
const config = { configurable: { thread_id: "1" } };
async function react(input) {
  const user = [{ role: "user", content: input }];
  const state = { messages: user };
  const stream = await agent.stream(state, {
    ...config,
    streamMode: "updates",
  });
  for await (const chunk of stream) {
    for (const [node, values] of Object.entries(chunk)) {
      console.log(`Receiving update from node: ${node}`);
      var msg = values.messages[0];
      if (msg.tool_calls?.length) {
        console.log("tool calls", msg.tool_calls);
      } else if (node === "agent") {
        if (msg.content) console.log(msg.content, msg.constructor.name, msg);
        else console.log(msg);
      }
      console.log("\n====\n");
    }
  }
  //console.log("state", await agent.getState(config));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const sentinel = "q";

async function promptUser() {
  console.log("going to ask question.........");
  rl.question('Enter prompt (type "exit" to quit): ', async (input) => {
    if (input.toLowerCase() === sentinel) {
      console.log("Sentinel value detected. Exiting loop.");
      rl.close();
    } else {
      console.log(`You entered: ${input}`);
      await react(input);
      console.log("--------------");
      promptUser(); // Repeat the loop
    }
  });
}

promptUser();
