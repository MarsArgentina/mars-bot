import Winston from "winston";
import DiscordTransport from "winston-discord-transport";

const transports: {
  discord?: Winston.transport;
  file?: Winston.transport;
  console?: Winston.transport;
} = {
  console: new Winston.transports.Console({
    
  })
};

export const Logger = Winston.createLogger({
  transports: Object.values(transports),
});

export const initializeLogger = () => {
  if (process.env.DISCORD_WEBHOOK) {
    if (transports.discord) {
      Logger.remove(transports.discord)
    }

    transports.discord = new ((DiscordTransport as any as {default: typeof DiscordTransport}).default)({
      webhook: process.env.DISCORD_WEBHOOK,
      defaultMeta: { Servicio: "MarsBot" },
      handleExceptions: true,
    });

    Logger.add(transports.discord)
  }
};


