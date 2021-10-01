import { Client, Intents } from "discord.js";
import { config as Dotenv } from "dotenv";
import process from "process";
import {
  connect,
  Database,
  helpers,
} from "temporary-database";
import { validateGuild, validateGuilds } from "./discord/methods/validateGuilds";
import { registerTriggers } from "./discord/triggers";

import "./bot/commands";
import "./bot/flows";
import { initializeLogger, Logger } from "./discord/methods/logger";
import { update } from "./bot/update";

Dotenv();

initializeLogger();

const detectDatabaseFailure = connect()
  .then(() => undefined)
  .catch((e) => helpers.guaranteeError(e));

const bot = new Client({
  partials: ["MESSAGE", "CHANNEL", "REACTION"],
  intents: [
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

bot.on("ready", async (bot) => {
  const databaseFailure = await detectDatabaseFailure;

  if (databaseFailure) {
    console.log("Database connection failed: ", databaseFailure);
  }

  Logger.info(
    `Bot started, id: ${bot.user.id}\nDatabase: ${databaseFailure ?? "Connected"}`
  );

  await validateGuilds(bot);
  await registerTriggers(bot);

  // bot.guilds.cache.forEach((guild) => {
  //   getSystemChannel(guild)?.send(
  //     `Estoy listo! ${
  //       databaseFailure ? "No estoy" : "Estoy"
  //     } conectado a la base de datos! ${
  //       databaseFailure
  //         ? `\n\nSe detecto el siguiente problema: ${databaseFailure.message}`
  //         : ""
  //     }`
  //   );
  // });

  bot.user.setActivity({
    type: "LISTENING",
    name: "!help"
  })

  bot.guilds.cache.forEach((guild) => update(guild))

  // console.log(
  //   "Mails rejected: ",
  //   getFulfilledResults(
  //     await Promise.allSettled(send(bulkEmails, new TestTemplate()))
  //   )
  //     .map((result, index) => ({ ...result, index }))
  //     .map((result) => ({
  //       ...result,
  //       rejected: [...(result.rejected ?? []), ...(result.pending ?? [])],
  //       index: `${result.index} - ${result.pending?.length ?? "0"}`,
  //     }))
  //     .filter((result) => (result.rejected?.length ?? 0) > 0)
  //     .map((result) => `(${result.index}) ${result.rejected[0]} Reason: ${result.response}`)
  // );

  // console.log(mailsSent());

  // const { users, invites } = await importers.importFromOldData(
  //   await readFile("../tabla.xlsx")
  // );
});

bot.on("guildCreate", (guild) => {
  validateGuild(guild);
});

if (!process.env.DISCORD_TOKEN) throw new Error("Discord token not found");
bot.login(process.env.DISCORD_TOKEN);

process.on("beforeExit", () => {
  Database.disconnect();
  bot.destroy();
});

process.on("SIGTERM", () => {
  Database.disconnect();
  bot.destroy();
});
