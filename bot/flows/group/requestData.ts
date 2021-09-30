import { ButtonInteraction, GuildMember, TextChannel } from "discord.js";
import { GroupModel, EventModel } from "temporary-database";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";

export const getRequestData = async (
  channel: TextChannel,
  user: GuildMember,
  interaction: ButtonInteraction
) => {
  const message = getInteractionMessage(interaction);

  const description = message.embeds.at(0)?.description;
  if (!description) {
    throw new Error("Esta solicitud tiene un error");
  }

  const userId = /^<@(\d+)>/.exec(description)?.at(1);
  if (!userId) {
    throw new Error("Esta solicitud tiene un error");
  }

  const member = await user.guild.members.fetch(userId);
  if (!member) {
    throw new Error("No pude encontrar a este miembro en el servidor de Discord.");
  }

  const group = await GroupModel.findOne({ mainChannel: channel.id });
  if (!group) {
    throw new Error("No encuentro este grupo en la base de datos.");
  }

  const event = await EventModel.fetchEvent(group.event);
  if (!event) {
    throw new Error("No encuentro el evento al que pertenece este grupo.");
  }

  return {
    group,
    event,
    member,
    message,
  } as const; 
};
