import {
  CategoryChannel,
  Collection,
  Guild,
  GuildMember,
  OverwriteData,
  Permissions,
  TextChannel,
} from "discord.js";
import config from "../../config.json";
import { MatchFilter, resolveMatchFilter } from "./matchFilter";

const FlowCategories = new Map(
  config.map(({ guild, channels }) => {
    return [guild, channels.flows];
  })
);

export type Flow = {
  readonly user: GuildMember;
  readonly channel: TextChannel;
};

export const setWritePermission = (flow: Flow, enabled: boolean) => {
  if (flow.channel.permissionsFor(flow.user).has(Permissions.FLAGS.SEND_MESSAGES) === enabled) return;

  return flow.channel.permissionOverwrites.edit(flow.user, {
    SEND_MESSAGES: enabled,
  });
};

const startMessage = (user: GuildMember, helpText: string) =>
  `Hola <@${user.id}>!\n\nVoy a ayudarte a ${helpText}`;

export const getFlowCategory = (guild: Guild) => {
  const id = FlowCategories.get(guild.id);

  if (!id) return undefined;

  const categoryChannels: (CategoryChannel | undefined)[] =
    guild.channels.cache.map((channel) =>
      channel.type === "GUILD_CATEGORY"
        ? (channel as CategoryChannel)
        : undefined
    );

  return categoryChannels.find((channel) => channel?.id === id);
};

export const newFlow = async (
  user: GuildMember,
  name: string,
  helpText: string
): Promise<Flow> => {
  const parent = getFlowCategory(user.guild);
  if (!parent) throw new Error("Couldn't find Flows category");

  const channel = await user.guild.channels.create(name, {
    parent,
  });

  await channel.lockPermissions();

  channel.permissionOverwrites.edit(user, {
    VIEW_CHANNEL: true,
    READ_MESSAGE_HISTORY: true,
  });

  await (await channel.send(startMessage(user, helpText))).pin();

  return {
    user,
    channel,
  } as const;
};

export const hasFlow = async (name: MatchFilter, user: GuildMember) => {
  const category = getFlowCategory(user.guild);
  if (!category) throw new Error("Couldn't find Flows category");

  const filter = resolveMatchFilter(name);

  const channels = category.children.map(async (channel) => {
    try {
      if (channel.isText() && channel.type === "GUILD_TEXT") {
        const flow = await getFlow(channel);
        if (flow.user.id !== user.id) return null;

        const pass =
          typeof filter === "boolean" ? filter : filter(channel.name);
        if (pass) return flow;
      }
    } catch (e) {}

    return null;
  });

  if (channels.length === 0) return null;

  return (
    (await Promise.all(channels)).find((value) => {
      return value !== null;
    }) ?? null
  );
};

export const getFlow = async (channel: TextChannel): Promise<Flow> => {
  const message = (await channel.messages.fetchPinned()).first();
  if (!message) throw new Error("Welcome message not found");

  const user = message.mentions.members?.first();
  if (!user) throw new Error("User not found");

  return {
    user,
    channel,
  } as const;
};
