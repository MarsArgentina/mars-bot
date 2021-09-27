import { APIInteractionGuildMember } from "discord-api-types";
import { Client, Guild, GuildMember, Interaction, Message, PartialUser, User } from "discord.js";
import { getUserGuild } from "./getUserGuild";

export const getMemberFromGuild = (guild: Guild, user: User|PartialUser) => {
  return guild?.members.cache.find((member) => member.user.id === user.id);
};

export const getMemberFromMessage = (message: Message) => {
  if (message.member) return message.member;

  const guild = message.guild ?? getUserGuild(message.author, message.client);

  return guild ? getMemberFromGuild(guild, message.author) : undefined;
};

export const getMember = (interaction: {member?: GuildMember|APIInteractionGuildMember|null, client: Client, user: User|PartialUser, guild?: Guild|null}) => {
  if (interaction.member instanceof GuildMember)
    return interaction.member;

  const guild =
    interaction.guild ?? getUserGuild(interaction.user, interaction.client);

  return guild ? getMemberFromGuild(guild, interaction.user) : undefined;
};
