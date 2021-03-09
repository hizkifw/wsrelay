const WebSocket = require("ws");
const port = process.env.PORT || 42069;
const server = new WebSocket.Server({ port });

const ERRORS = {
  METHOD_NOT_FOUND: {
    code: -32601,
    message: "Method not found.",
  },
};

let sockets = [];
const subscriptions = {};

server.on("connection", (socket) => {
  sockets.push(socket);

  socket.on("message", (msg) => {
    let id = 0;
    try {
      const { method, params, ...rest } = JSON.parse(msg);
      id = rest.id || 0;

      if (method === "subscribe") {
        for (const subId of params) {
          if (!Array.isArray(subscriptions[subId])) subscriptions[subId] = [];
          subscriptions[subId].push(socket);
        }
        socket.send(JSON.stringify({ id, result: "Success" }));
      } else if (method === "unsubscribe") {
        for (const subId of params) {
          if (!Array.isArray(subscriptions[subId])) subscriptions[subId] = [];
          subscriptions[subId] = subscriptions[subId].filter(
            (s) => s !== socket
          );
        }
        socket.send(JSON.stringify({ id, result: "Success" }));
      } else if (method === "publish") {
        const [subId, data] = params;
        if (Array.isArray(subscriptions[subId])) {
          for (const sub of subscriptions[subId]) {
            try {
              sub.send(JSON.stringify({ id: -1, result: [subId, data] }));
            } catch (ex) {}
          }
        }
        socket.send(JSON.stringify({ id, result: "Success" }));
      } else {
        socket.send(JSON.stringify({ id, error: ERRORS.METHOD_NOT_FOUND }));
      }
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

server.on("listening", () => {
  console.log(`Listening on port ${port}`);
});
