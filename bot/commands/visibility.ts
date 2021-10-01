import { Message, TextChannel } from "discord.js";
import {
  GroupModel,
  EventModel,
  UserModel,
} from "temporary-database";
import { guaranteeError } from "temporary-database/dist/helpers";
import { GroupChannelFilter } from "../../discord/filters";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { CommandTrigger } from "../../discord/triggers";
import {
  getControlPanelMessage,
  setVisibility,
} from "../flows/group/controlPanel";

const findGroup = async (channel: TextChannel, message: Message) => {
  const group = await GroupModel.findOne({ mainChannel: channel.id });

  if (group) {
    const event = await EventModel.fetchEvent(group.event);
    if (!event)
      throw new Error("No se encontró el evento al cual pertenece este grupo.");

    return { group, event, channel } as const;
  }

  if (!group && channel.parentId) {
    const event = await EventModel.findOne({ category: channel.parentId });
    if (!event)
      throw new Error(
        "Este comando no fue usado en un canal de grupo o en un comandos-evento."
      );

    const member = getMemberFromMessage(message);
    if (!member)
      throw new Error(
        "La persona que uso este comando no es miembro del servidor."
      );

    const user = await UserModel.findFromDiscord(member.id);
    if (!user)
      throw new Error(
        `No pude encontrar a este usuario en la base de datos <@${member.id}>.`
      );

    const invite = await user.getInvite(event);
    if (!invite || !invite.group)
      throw new Error(
        "Este usuario no forma parte de un grupo o de este evento."
      );

    const group = (await GroupModel.fetchGroup(invite.group)) ?? null;

    if (group) {
      const groupChannel = await member.guild.channels.fetch(
        group?.mainChannel
      );
      if (groupChannel?.type !== "GUILD_TEXT")
        throw new Error(
          "El canal de mensajes de este grupo ha sido eliminado."
        );

      return { group, event, channel: groupChannel } as const;
    }
  }

  throw new Error("No se encontro el grupo en la base de datos.");
};

new CommandTrigger(
  {
    name: "visibility",
    alias: ["visibilidad"],
    parameters: "<mostrar|ocultar|cambiar>",
    description: "Cambia la visibilidad del grupo.",
    filters: [
      new GroupChannelFilter({
        canBeUsedInCommands: true,
        error:
          "Este comando solo puede ser utilizado en un grupo o en comandos-evento",
      }),
    ],
  },
  async (message, { parameters }) => {
    const channel = message.channel;
    if (channel?.type !== "GUILD_TEXT") return;

    try {
      const { group, event, channel: groupChannel } = await findGroup(channel, message);

      const controlPanel = await getControlPanelMessage(groupChannel);
      if (!controlPanel) {
        throw new Error("No se encontro el panel de control de este grupo.");
      }

      const toggle = (parameters.at(0) ?? "").toLowerCase().trim();
      switch (toggle) {
        case "":
        case "cambiar":
        case "toggle":
          group.isOpen = !group.isOpen;
          break;

        case "show":
        case "shown":
        case "open":
        case "mostrar":
        case "abierto":
        case "abrir":
          group.isOpen = true;
          break;

        case "hide":
        case "hidden":
        case "close":
        case "ocultar":
        case "cerrar":
        case "cerrado":
          group.isOpen = false;
          break;

        default:
          throw new Error(
            `Lo siento, no se que significa "${toggle}", quizá quisiste usar uno de estos: mostrar, ocultar, cambiar`
          );
      }

      await setVisibility(controlPanel, await group.save(), event);

      return await message.reply(
        `Se cambio la visibilidad del grupo **${group.name}** a ${
          group.isOpen ? "abierto" : "cerrado"
        }.`
      );
    } catch (e) {
      return await message.reply(guaranteeError(e).message);
    }
  }
);
