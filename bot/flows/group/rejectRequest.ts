import { GuildMember, Message, MessageButton, MessageEmbed } from "discord.js";
import { findLastMessage } from "../../../discord/filters/reply";
import { component } from "../../../discord/methods/component";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";
import { hasFlow } from "../../../discord/methods/flow";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { ButtonTrigger } from "../../../discord/triggers";
import { deleteContinueHere } from "./continueHere";
import { getRequestData } from "./requestData";
import { helpers } from "temporary-database";

export const rejectRequestButton = () => {
  return new MessageButton({
    customId: "rejectGroupRequest",
    label: "Rechazar",
    style: "DANGER",
  });
};

new ButtonTrigger(
  {
    id: "rejectGroupRequest",
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
      await rejectRequest(member, event.name, group.name, message);
    } catch (e) {
      const error = helpers.guaranteeError(e);

      return await interaction.reply(error.message);
    }
  }
);

export const rejectRequest = async (
  member: GuildMember,
  eventName: string,
  groupName: string,
  request: Message
) => {
  const flow = await hasFlow(
    new RegExp(`^${escapeRegexp(`grupo-${eventName}`)}`, "i"),
    member
  );

  if (!flow) throw new Error("No se encontró esta solicitud.");

  const channelName = flow.channel.setName(`x-${flow.channel.name}`);

  await deleteContinueHere(flow, member);

  const message = await findLastMessage(flow.channel, { limit: 10 });
  if (message?.embeds?.length ?? 0 > 0) {
    await (message as Message).delete();
  }

  const { image, file } = getFullWidth();

  const rejectedMessage = flow.channel.send({
    embeds: [
      new MessageEmbed()
        .setTitle("Solicitud Rechazada")
        .setDescription(
          `Lo sentimos <@${member.id}>, tu solicitud al grupo "${groupName}" fue rechazada.`
        )
        .setColor("RED")
        .setImage(image),
    ],
    files: [file],
    components: component(
      new MessageButton({
        style: "SECONDARY",
        label: "Finalizar",
        customId: "finishGroupRequest",
      })
    ),
  });

  return [request.delete(), rejectedMessage, channelName];
};
