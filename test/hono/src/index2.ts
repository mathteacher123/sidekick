import { Hono } from 'hono'
import { stream, streamText, streamSSE } from 'hono/streaming'

import {createModel} from '../../utils.js'

const app = new Hono()

app.get('/',  async (c) => {
  const model = createModel();
  const stream = await model.streamEvents(
    'hell wolrld!',
    {
      version:'v2',
       encoding: "text/event-stream",
    }
  );
  return new Response(stream,  {
    headers: {
      "content-type": "text/event-stream",
    }
  });
})

export default app