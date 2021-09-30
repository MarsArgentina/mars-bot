import { default as ColorHash } from "color-hash";
import { Guild, MessageButton, MessageEmbed, TextChannel } from "discord.js";
import { EventDocument, GroupDocument } from "temporary-database";
import { component } from "../../../discord/methods/component";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { requestJoinButton } from "./join";

const hasher = new (ColorHash as any).default() as ColorHash;

export const sendGroupListMessage = (
  event: EventDocument,
  group: GroupDocument,
  sendFile = true
) => {
  const { file, image } = getFullWidth();

  const location = JSON.parse(group.meta).location;

  const embed = new MessageEmbed()
    .setTitle(group.name)
    .setDescription(
      `
**Miembros:** ${group.members.length} de ${event.maxGroupSize}
${typeof location === "string" ? `**Localidad:** ${location}` : ""}`.trim()
    )
    .setColor(
      hasher.hex(
        `${event.name}${typeof location === "string" ? ` ${location}` : ""}`
      ) as `#${string}`
    )
    .setImage(image)
    .setFooter(group.id as string);

  return {
    embeds: [embed],
    files: sendFile ? [file] : undefined,
    components: component(
      requestJoinButton()
    ),
  };
};

export const getGroupListChannel = async (
  event: EventDocument,
  guild: Guild
) => {
  const groupChannel = JSON.parse(event.meta).groupListChannel;

  if (typeof groupChannel !== "string") return null;

  const channel = await guild.channels.fetch(groupChannel);

  if (channel?.type !== "GUILD_TEXT") return null;

  return channel;
};

export const getGroupListMessage = async (channel: TextChannel, id: string) =>
  await channel.messages.fetch(id);
