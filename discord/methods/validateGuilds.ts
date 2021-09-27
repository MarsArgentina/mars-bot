import { Client, Guild } from "discord.js";

import config from "../../config.json";

const whitelist = new Set(config.map(({guild}) => guild))

export const validateGuild = async (guild: Guild) => {
  if (!whitelist.has(guild.id)) {
    await guild.leave();
    console.log(
      `JOIN: Se intentó agregar a Mars Bot a un servidor invalido: "${guild.name}" (ID: ${guild.id})`
    );
  }
}

export const validateGuilds = (bot: Client) => {
  return Promise.allSettled(bot.guilds.cache.map(validateGuild));
};
