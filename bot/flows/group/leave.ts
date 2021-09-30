import type { Ref } from "@typegoose/typegoose";
import { GuildMember, MessageButton } from "discord.js";
import {
  Event,
  EventModel,
  GroupDocument,
  GroupModel,
  UserModel,
} from "temporary-database";
import { guaranteeError } from "temporary-database/dist/helpers";
import { ButtonTrigger } from "../../../discord/triggers";
import { getControlPanelMessage, sendControlPanel } from "./controlPanel";

export const leaveGroupButton = () =>
  new MessageButton({
    customId: "leaveGroup",
    label: "Abandonar",
    style: "DANGER",
  });

export const leaveGroup = async (
  member: GuildMember,
  event: Ref<Event> | string,
  group: GroupDocument
) => {
  const user = await UserModel.findFromDiscord(member.id);
  if (!user) throw new Error("No se encontró el usuario en la base de datos.");

  const invite = await user.getInvite(event);
  if (!invite) throw new Error("El usuario no tiene una invitación al evento");

  group = group ?? (await GroupModel.fetchGroup(invite.group));
  if (!group) throw new Error("No sos miembro de un grupo");

  group.removeInvite(invite);
  return await group.save();
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

      group = await leaveGroup(user, group.event, group);

      const controlPanel = await getControlPanelMessage(channel);
      controlPanel?.edit(
        sendControlPanel(
          group,
          event,
          controlPanel.embeds.at(0)?.footer?.text,
          false
        )
      );
    } catch (e) {
      const error = guaranteeError(e);

      return await interaction.reply({
        content: error.message,
        ephemeral: true,
      });
    }
  }
);
