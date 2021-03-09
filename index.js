const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 42069 });

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
        for (const streamId of params) {
          if (!Array.isArray(subscriptions[streamId]))
            subscriptions[streamId] = [];
          subscriptions[streamId].push(socket);
        }
        socket.send(JSON.stringify({ id, result: "Success" }));
      } else if (method === "unsubscribe") {
        for (const streamId of params) {
          if (!Array.isArray(subscriptions[streamId]))
            subscriptions[streamId] = [];
          subscriptions[streamId] = subscriptions[streamId].filter(
            (s) => s !== socket
          );
        }
        socket.send(JSON.stringify({ id, result: "Success" }));
      } else if (method === "publish") {
        const [streamId, data] = params;
        if (Array.isArray(subscriptions[streamId])) {
          for (const sub of subscriptions[streamId]) {
            sub.send(JSON.stringify({ id: -1, result: [streamId, data] }));
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
  });
});
