import { Client, Guild, Message, User } from "discord.js";
import { getAdminRole, isAdmin } from "./getServerRoles";
import { resolveMatchFilter, MatchFilter } from "./matchFilter";

export const hasRole = (
  guild: Guild | Client,
  user: User,
  roles?: MatchFilter
) => {
  let finalGuild: Guild;
  if (guild instanceof Client) {
    const temp = guild.guilds.cache.find((guild) => {
      return guild.members.cache.has(user.id);
    });

    if (!temp) return false;

    finalGuild = temp;
  } else {
    finalGuild = guild;
  }

  const member = finalGuild.members.cache.get(user.id);

  if (!member) return false;
  
  if (isAdmin(member)) return true;
  
  const filter = resolveMatchFilter(roles)
  if (typeof filter === "boolean") return filter && member.roles.cache.size > 0;

  return !!member.roles.cache.find(({name}) => filter(name))
};

export const hasRoleFromMessage = (
  message: Message,
  roles?: (RegExp | string)[]
) => {
  return hasRole(message.guild ?? message.client, message.author, roles);
};
