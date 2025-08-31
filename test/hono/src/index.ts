import { Hono } from 'hono'
import { stream, streamText, streamSSE } from 'hono/streaming'

import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
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
  return await client.getTools();
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

const createAgent = async (env) =>{
   const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-pro",
    temperature: 0,
    apiKey:env.GOOGLE_API_KEY
  });
  return createReactAgent({
    llm: model,
    tools:await loadTools(env),// [calculate, average_dog_weight, getWeather], //wpTools, //agentTools,
    //checkpointSaver: agentCheckpointer,
    //prompt: systemPrompt,
  });
  return agent;
}
/*
app.get('/',  async (c) => {
  const msg = await callModel('hello world', c.env)
  const tools = await loadTools(c.env)
  return c.json({a:123,msg:msg.content, tools})
})
*/
app.post('/a1',  async (c) => {
  const { input } = await c.req.json()
  const agent = await createAgent(c.env);
  const config = { configurable: { thread_id: "1" }};
  const user = [{ role: "user", content: input }];
  const state = { messages: user };
  const agentStream = await agent.stream(state, {
    ...config,
    //version: "v2",
    //streamMode: "updates",
  });
  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of agentStream) {
        for (const [node, values] of Object.entries(chunk)) {
          const obj = values as any;
          //console.log(node, JSON.stringify(obj.messages[0]),"\n");
          //for(var i=0;i<5;++i){
            controller.enqueue(encoder.encode(JSON.stringify(obj.messages[0].content).substr(0,300) + '\u001e'));
            //await new Promise(r=>setTimeout(r,1000))
          //}
        }
      }
      controller.close();
    },
  });

  const headers = new Headers({
    "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
  });
  for (const [key, value] of headers.entries()) c.header(key,value);
  c.header('Content-Encoding', 'Identity')
  return stream(c, async (stream) => stream.pipe(readableStream))
  return c.json(stream)
})
app.get('/s', (c) => {
  c.header('Content-Encoding', 'Identity')
  return streamText(c, async (stream) => {
    for(var i=0;i<20;++i){
    // Write a text with a new line ('\n').
      await stream.writeln('Hello' + " " + i)
      // Wait 1 second.
      await stream.sleep(1000)
    }
    // Write a text without a new line.
    await stream.write(`Hono!`)
  })
})

let id = 0

app.get('/sse', async (c) => {
  return streamSSE(c, async (stream) => {
    while (true) {
      const message = `It is ${new Date().toISOString()}`
      await stream.writeSSE({
        data: message,
        event: 'time-update',
        id: String(id++),
      })
      await stream.sleep(1000)
    }
  })
})

app.get('/p', (c) =>
  c.html(`
  <div id="output"></div>
  <form id="myForm" method="post">
    <input type="text" name="input" required />
    <button type="submit">Submit</button>
  </form>
  <script>
    document.getElementById('myForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const form = e.target;
      const input = form.input.value;
      const outputDiv = document.getElementById('output');
      const submitBtn = form.querySelector('button[type="submit"]');

      // Show progress
      const originalBtnText = submitBtn.innerText;
      submitBtn.innerText = 'Sending...';
      submitBtn.disabled = true;

      // Append user input
      const userLine = document.createElement('div');
      userLine.innerText = 'You: ' + input;
      outputDiv.appendChild(userLine);

      try {
        const res = await fetch('/a1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const responseLine = document.createElement('div');
        responseLine.innerText = 'Bot: ';
        outputDiv.appendChild(responseLine);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          responseLine.innerText += decoder.decode(value);
        }

        // Add blank line after conversation
        outputDiv.appendChild(document.createElement('br'));
      } catch (error) {
        const errorLine = document.createElement('div');
        errorLine.innerText = 'Error: Something went wrong.';
        outputDiv.appendChild(errorLine);
      } finally {
        // Reset form
        form.input.value = '';
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  </script>
  `));

app.post('/a', async (c) => {
  const { input } = await c.req.json()
c.header('Content-Encoding', 'Identity')
  return stream(c, async (stream) => {
    for (const char of input.split('')) {
      await stream.write(char)
      await new Promise((r) => setTimeout(r, 100)) // simulate delay
    }
    stream.close()
  })
})
export default app
