import { User, Client, PartialUser } from "discord.js";
import { getMemberFromGuild } from "./getMember";


export const getUserGuild = (user: User|PartialUser, client: Client) => {
  return client.guilds.cache.find((guild) => {
    return !!getMemberFromGuild(guild, user);
  }) ?? null;
};
