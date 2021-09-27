import { Message } from "discord.js";
import config from "../../config.json";

const Prefix = new Map(
  config.map(({ guild, commandPrefix }) => {
    return [guild, commandPrefix];
  })
);

const DEFAULT_PREFIX = "!";

export const getPrefix = (message: Message) => {
  return (
    (message.guild ? Prefix.get(message.guild.id) : undefined) ?? DEFAULT_PREFIX
  );
};

export const parseCommand = (message: Message) => {
  const prefix = getPrefix(message);
  const [first, ...args] = message.cleanContent.trim().split(" ");

  const command = new RegExp(`^\\${prefix}(.+)`, "gi").exec(first);

  if (command) return [command[1], ...args] as const;

  return [null] as const;
};
