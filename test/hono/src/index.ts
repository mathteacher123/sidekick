import { Hono } from 'hono'
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

//import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";


/*
import * as aa from "../../agent.js"
const agent = await aa.main();
const config = { configurable: { thread_id: "1" } };
*/
const app = new Hono()

const callModel = async(input:string, env:any)=>{
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0,
    apiKey:env.GOOGLE_API_KEY
  });
  return await model.invoke(['user',input]);
};

const loadTools = async (env:any)=>{
  const client = new MultiServerMCPClient({
    "wordpress-mcp": {
      transport: "http",
      url: "http://wps.zya.me/wp-json/wp/v2/wpmcp/streamable",
      headers: {
        Authorization: `Bearer ${env.WP_MCP_TOKEN}`,
      },
    },
  });
  return (await client.getTools()).map(t=>t.name);
};

const loadTools1 = async (env)=>{
  // Replace with your MCP server's HTTP endpoint
  const transport = new StreamableHTTPClientTransport(
    "http://wps.zya.me/wp-json/wp/v2/wpmcp/streamable",
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${env.WP_MCP_TOKEN}`,
        },
      },
    }
  );
  
  const client = new Client({
    name: "example-client",
    version: "1.0.0",
  });
  
  await client.connect(transport);
  
  // List prompts
  const a = (await client.listTools()) as any;
  return a.map(t=>t.name);
}
app.get('/',  async (c) => {
  const msg = await callModel('hello world', c.env)
  const tools = await loadTools1(c.env)
  return c.json(msg.content, tools)
  
})

export default app
