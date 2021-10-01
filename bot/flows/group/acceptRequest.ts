import { GuildMember, MessageButton } from "discord.js";
import { GroupDocument, UserModel, EventDocument } from "temporary-database";
import { helpers } from "temporary-database";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";
import { hasFlow } from "../../../discord/methods/flow";
import { ButtonTrigger } from "../../../discord/triggers";
import { getControlPanelMessage, sendControlPanel } from "./controlPanel";
import { getGroupListMessage, getGroupListChannel,sendGroupListMessage } from "./list";
import { rejectRequest } from "./rejectRequest";
import { getRequestData } from "./requestData";

export const acceptRequestButton = () => {
  return new MessageButton({
    customId: "acceptGroupRequest",
    label: "Aceptar",
    style: "SUCCESS",
  });
};

export const joinGroup = async (
  event: EventDocument,
  group: GroupDocument,
  member: GuildMember
): Promise<Promise<any>[]> => {
  const flow = await hasFlow(
    new RegExp(`^${escapeRegexp(`grupo-${event.name}`)}`, "i"),
    member
  );

  if (group.members.length >= event.maxGroupSize) {
    throw new Error("Este grupo ya está lleno");
  }

  const channel = await member.guild.channels.fetch(group.mainChannel);
  if (!channel?.isText() || channel.type !== "GUILD_TEXT") {
    throw new Error("El canal de texto de este grupo fue eliminado.");
  }

  const doc = await UserModel.findFromDiscord(member.id);
  const invite = await doc?.getInvite(event);

  if (!invite) {
    throw new Error("No se pudo encontrar la invitación de este usuario.");
  }

  group.addInvite(invite);
  invite.group = group;

  const saved = group.save();

  const promises: Promise<any>[] = [
    saved,
    invite.save(),
    flow?.channel?.delete?.() ?? Promise.resolve(),
    channel.send(`<@${member.id}> ya formás parte de este grupo.`),
  ];

  const controlPanel = await getControlPanelMessage(channel);

  if (controlPanel) {
    const listId = controlPanel?.embeds.at(0)?.footer?.text;

    if (listId) {
      const listChannel = await getGroupListChannel(event, member.guild);
      const listMessage = listChannel ? await getGroupListMessage(listChannel, listId) : null;

      if (listMessage) {
        promises.push(
          listMessage.edit(sendGroupListMessage(event, group, false))
        );
      }
    }

    promises.push(
      controlPanel.edit(sendControlPanel(await saved, event, listId, false))
    );
  }

  return promises;
};

new ButtonTrigger(
  {
    id: "acceptGroupRequest",
    dontUpdate: true,
  },
  async (channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;

    try {
      const { group, event, member, message } = await getRequestData(
        channel,
        user,
        interaction
      );

      if (group.members.length >= event.maxGroupSize) {
        rejectRequest(member, event.name, group.name, message);

        return await interaction.reply({
          content: "Este grupo ya esta lleno",
          ephemeral: true,
        });
      }

      const promise = await joinGroup(event, group, member);
      await Promise.allSettled([message.delete(), ...promise]);
    } catch (e) {
      const error = helpers.guaranteeError(e);

      return await interaction.reply(error.message);
    }
  }
);
