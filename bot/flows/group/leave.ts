import type { Ref } from "@typegoose/typegoose";
import { GuildMember, MessageButton } from "discord.js";
import {
  Event,
  EventDocument,
  EventModel,
  GroupDocument,
  GroupModel,
  UserModel,
} from "temporary-database";
import { guaranteeError } from "temporary-database/dist/helpers";
import { ButtonTrigger } from "../../../discord/triggers";
import { getControlPanelMessage, sendControlPanel } from "./controlPanel";
import {
  getGroupListChannel,
  getGroupListMessage,
  sendGroupListMessage,
} from "./list";

export const leaveGroupButton = () =>
  new MessageButton({
    customId: "leaveGroup",
    label: "Abandonar",
    style: "DANGER",
  });

export const leaveGroup = async (
  member: GuildMember,
  eventId: Ref<Event> | string,
  group?: GroupDocument
) => {
  const user = await UserModel.findFromDiscord(member.id);
  if (!user) throw new Error("No se encontró el usuario en la base de datos.");

  const invite = await user.getInvite(eventId);
  if (!invite) throw new Error("El usuario no tiene una invitación al evento.");

  const event = await EventModel.fetchEvent(eventId) ?? undefined;
  if (!event)
    throw new Error("No se encontró el evento al que este grupo pertenece.");

  group = group ?? (await GroupModel.fetchGroup(invite.group)) ?? undefined;
  if (!group) throw new Error("No sos miembro de un grupo.");

  group.removeInvite(invite);
  invite.group = undefined;

  const leave = group.save();

  const promises: Promise<any>[] = [leave, invite.save()];

  const channel = await member.guild.channels.fetch(group.mainChannel);

  if (channel?.type === "GUILD_TEXT") {
    const controlPanel = await getControlPanelMessage(channel);

    if (controlPanel) {
      const listId = controlPanel?.embeds.at(0)?.footer?.text;

      if (listId) {
        const listChannel = await getGroupListChannel(event, member.guild);
        const listMessage = listChannel
          ? await getGroupListMessage(listChannel, listId)
          : null;

        if (listMessage) {
          promises.push(
            listMessage.edit(sendGroupListMessage(event, group, false))
          );
        }
      }

      promises.push(
        controlPanel.edit(sendControlPanel(await leave, event, listId, false))
      );
    }
  }

  return promises;
};

new ButtonTrigger(
  {
    id: "leaveGroup",
  },
  async (channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;

    try {
      let group = await GroupModel.findOne({ mainChannel: channel.id });
      if (!group)
        throw new Error("No se encontró el grupo que deseas abandonar.");

      const event = await EventModel.fetchEvent(group.event);
      if (!event)
        throw new Error(
          "No se encontró el evento del que este grupo forma parte."
        );

      const promises = await leaveGroup(user, event, group);

      return await Promise.all(promises);
    } catch (e) {
      const error = guaranteeError(e);

      return await interaction.reply({
        content: error.message,
        ephemeral: true,
      }).catch(() => {});
    }
  }
);
