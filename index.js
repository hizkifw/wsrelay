const http = require("http");
const WebSocket = require("ws");
const port = process.env.PORT || 42069;

let sockets = [];
const subscriptions = {};

const ERRORS = {
  METHOD_NOT_FOUND: {
    code: -32601,
    message: "Method not found.",
  },
};

const handleMessage = ({ method, params, ...rest }, socket) => {
  id = rest.id || 0;

  if (method === "publish") {
    const [subId, data] = params;
    if (Array.isArray(subscriptions[subId])) {
      for (const sub of subscriptions[subId]) {
        try {
          sub.send(JSON.stringify({ id: -1, result: [subId, data] }));
        } catch (ex) {}
      }
    }
    return { id, result: "Success" };
  } else if (method === "subscribe") {
    for (const subId of params) {
      if (!Array.isArray(subscriptions[subId])) subscriptions[subId] = [];
      if (!subscriptions[subId].includes(socket))
        subscriptions[subId].push(socket);
    }
    return { id, result: "Success" };
  } else if (method === "unsubscribe") {
    for (const subId of params) {
      if (!Array.isArray(subscriptions[subId])) subscriptions[subId] = [];
      subscriptions[subId] = subscriptions[subId].filter((s) => s !== socket);
    }
    return { id, result: "Success" };
  }

  return { id, error: ERRORS.METHOD_NOT_FOUND };
};

const readJSON = async (stream) =>
  new Promise((resolve, reject) => {
    let stringContent = "";
    stream.on("data", (chunk) => {
      stringContent += chunk.toString();
    });
    stream.on("end", () => {
      try {
        resolve(JSON.parse(stringContent));
      } catch (ex) {
        reject(ex);
      }
    });
  });

const server = http.createServer((req, res) => {
  try {
    if (req.method !== "POST") {
      res.writeHead(405, { Allow: "POST" });
      res.write("Method not allowed");
      res.end();
      return;
    }
    readJSON(req).then((json) => {
      const handleResult = JSON.stringify(handleMessage(json, null));
      res.writeHead(200);
      res.write(handleResult);
      res.end();
    });
  } catch (err) {
    res.writeHead(400);
    res.write(err.toString());
    res.end();
  }
});
const wss = new WebSocket.Server({ server });

wss.on("connection", (socket) => {
  sockets.push(socket);

  socket.on("message", (msg) => {
    let id = 0;
    try {
      socket.send(JSON.stringify(handleMessage(JSON.parse(msg), socket)));
    } catch (ex) {
      socket.send(
        JSON.stringify({ id, error: { message: ex.message, code: -1 } })
      );
    }
  });

  socket.on("close", () => {
    sockets = sockets.filter((s) => s !== socket);
    const subIds = Object.keys(subscriptions);
    for (const subId of subIds) {
      subscriptions[subId] = subscriptions[subId].filter((s) => s !== socket);
    }
  });
});

wss.on("listening", () => {
  console.log(`Listening on port ${port}`);
});

setInterval(() => {
  handleMessage({
    method: "publish",
    params: ["ping", Date.now()],
  });
}, 5000);

server.listen(port);
