import { Guild, GuildMember } from "discord.js";
import config from "../../config.json";

const Admin = new Map(
  config.map(({ guild, admin }) => {
    return [guild, admin];
  })
);

export const getAdminRole = (guild: Guild) => {
  const role = Admin.get(guild.id)
  if (!role) return undefined;
  return guild.roles.cache.get(role)
};

export const isAdmin = (member: GuildMember) => {
  const role = getAdminRole(member.guild)
  if (!role) return false;

  return !!member.roles.cache.has(role.id)
};

const Validated = new Map(
  config.map(({ guild, validated }) => {
    return [guild, validated];
  })
);

export const getValidatedRole = (guild: Guild) => {
  const role = Validated.get(guild.id)
  if (!role) return undefined;
  return guild.roles.cache.get(role)
};

export const isValidated = (member: GuildMember) => {
  const role = getValidatedRole(member.guild)
  if (!role) return false;

  return !!member.roles.cache.has(role.id)
};
