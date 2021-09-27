import { Guild, TextBasedChannels } from "discord.js";
import config from "../../config.json";

const System = new Map(
  config.map(({ guild, channels }) => {
    return [guild, channels.system];
  })
);

export const getSystemChannel = (guild: Guild) => {
  const id = System.get(guild.id);

  if (!id) return undefined;

  const textChannels: (TextBasedChannels|undefined)[] = guild.channels.cache
    .map((channel) => (channel.isText() ? channel : undefined))

  return textChannels.find((channel) => channel?.id === id);
};

const Rules = new Map(
  config.map(({ guild, channels }) => {
    return [guild, channels.rules];
  })
);

export const getRulesChannel = (guild: Guild) => {
  const id = Rules.get(guild.id);

  if (!id) return undefined;

  const textChannels: (TextBasedChannels|undefined)[] = guild.channels.cache
    .map((channel) => (channel.isText() ? channel : undefined))

  return textChannels.find((channel) => channel?.id === id);
};

const Announcements = new Map(
  config.map(({ guild, channels }) => {
    return [guild, channels.announcements];
  })
);

export const getAnnouncementsChannel = (guild: Guild) => {
  const id = Announcements.get(guild.id);

  if (!id) return undefined;

  const textChannels: (TextBasedChannels|undefined)[] = guild.channels.cache
    .map((channel) => (channel.isText() ? channel : undefined))

  return textChannels.find((channel) => channel?.id === id);
};

