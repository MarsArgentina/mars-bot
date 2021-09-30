import { GuildMember, MessageButton } from "discord.js";
import {
  GroupDocument,
  GroupModel,
  UserModel,
  EventModel,
  EventDocument,
} from "temporary-database";
import { helpers } from "temporary-database";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";
import { hasFlow } from "../../../discord/methods/flow";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { ButtonTrigger } from "../../../discord/triggers";
import { getControlPanelMessage, sendControlPanel } from "./controlPanel";
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
) => {
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

  const controlPanel = await getControlPanelMessage(channel)
  const saved = group.save();

  return [
    saved,
    controlPanel?.edit(sendControlPanel(await saved, event, controlPanel.embeds.at(0)?.footer?.text, false)),
    flow?.channel?.delete?.(),
    channel.send(`<@${member.id}> ya formás parte de este grupo.`),
  ];
};

new ButtonTrigger(
  {
    id: "acceptGroupRequest",
    dontUpdate: true,
  },
  async (channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;

    try {
      const {group, event, member, message} = await getRequestData(channel, user, interaction)

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
