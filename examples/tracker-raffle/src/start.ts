import { raffleSerializationAdapter } from "@raffle/react";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    createCsrfMiddleware({
      filter: (ctx) => ctx.handlerType === "serverFn",
    }),
  ],
  // Lets loaders return a raffle: it travels as plain data and is rebuilt on the client.
  serializationAdapters: [raffleSerializationAdapter],
}));
