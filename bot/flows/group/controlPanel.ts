import {
  Interaction,
  Message,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  TextChannel,
} from "discord.js";
import {
  EventDocument,
  EventModel,
  GroupDocument,
  GroupModel,
} from "temporary-database";
import { guaranteeError } from "temporary-database/dist/helpers";
import { component } from "../../../discord/methods/component";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { getMemberFromMessage } from "../../../discord/methods/getMember";
import { ButtonTrigger, OptionsTrigger } from "../../../discord/triggers";
import { leaveGroupButton } from "./leave";
import {
  getGroupListChannel,
  getGroupListMessage,
  sendGroupListMessage,
} from "./list";

export const sendControlPanel = (
  group: GroupDocument,
  event: EventDocument,
  listId?: string,
  sendFile = true
) => {
  const { file, image } = getFullWidth();

  const eventMeta = JSON.parse(event.meta);
  const locations = eventMeta.locations;

  const groupMeta = JSON.parse(group.meta);
  const location = groupMeta.location;

  const names = Array.isArray(locations)
    ? locations.map(({ name }) => name).filter((name) => name && name !== "")
    : [];

  const LocationSelect =
    names.length > 0
      ? new MessageSelectMenu({
          customId: "setGroupLocation",
          options: names.map((name) => ({
            label: name,
            value: name,
            default: name === location,
          })),
          placeholder: "Localidad del grupo",
        })
      : undefined;

  const embed = new MessageEmbed()
    .setImage(image)
    .setTitle("Panel de Control")
    .setDescription(
      `
**Evento:** ${event.name}
**Miembros:** ${group.members.length} de ${event.maxGroupSize}
**Visibilidad:** ${group.isOpen ? "Abierto" : "Cerrado"}
**Código de accesso:** ||${group.accessCode}||
    `.trim()
    );

  if (listId) embed.setFooter(listId);

  return {
    embeds: [embed],
    files: sendFile ? [file] : undefined,
    components: component(LocationSelect, [
      new MessageButton({
        customId: "toggleGroupVisibility",
        label: group.isOpen ? "Cerrar Grupo" : "Abrir Grupo",
        style: "SECONDARY",
      }),
      leaveGroupButton(),
    ]),
  };
};

export const getControlPanelMessage = async (channel: TextChannel) => {
  const pinned = await channel.messages.fetchPinned();

  return pinned.find(
    (message) =>
      message.author.bot && message.author.id === channel.client.user?.id
  );
};

export const setVisibility = async (
  message: Message,
  group: GroupDocument,
  event: EventDocument
) => {
  const member = getMemberFromMessage(message);
  if (!member)
    throw new Error(
      "Este comando fue invocado por alguien que no es miembro del servidor de Discord."
    );

  const listChannel = await getGroupListChannel(event, member.guild);
  if (!listChannel) throw new Error("No se encontro la lista de grupos.");

  let listId = undefined;
  if (!group.isOpen) {
    const listId = message.embeds.at(0)?.footer?.text;

    if (listId) {
      await (await getGroupListMessage(listChannel, listId)).delete();
    }
  } else {
    const message = await listChannel.send(
      sendGroupListMessage(event, group, true)
    );

    listId = message.id;
  }

  await message.edit(sendControlPanel(group, event, listId, false));
};

new ButtonTrigger(
  {
    id: "toggleGroupVisibility",
    dontUpdate: true,
  },
  async (channel, user, interaction) => {
    try {
      const message = getInteractionMessage(interaction);

      const group = await GroupModel.findOne({ mainChannel: channel.id });
      if (!group)
        throw new Error(
          "No se encontró el grupo al cual se desea cambiar la visibilidad."
        );

      const event = await EventModel.fetchEvent(group.event);
      if (!event)
        throw new Error(
          "No se encontró el evento al que pertenece este grupo."
        );

      group.isOpen = !group.isOpen;
      await setVisibility(message, await group.save(), event);
      await interaction.reply({
        content: `Se cambio la visibilidad de este grupo a ${
          group.isOpen ? "abierto" : "cerrado"
        }`,
        ephemeral: true,
      });
    } catch (e) {
      return await interaction.reply({
        content: guaranteeError(e).message,
        ephemeral: true,
      });
    }
  }
);

new OptionsTrigger(
  {
    id: "setGroupLocation",
  },
  async (values, channel, user, interaction) => {
    const message = getInteractionMessage(interaction);

    let group = await GroupModel.findOne({ mainChannel: channel.id });
    if (!group) return "error";

    const event = await EventModel.fetchEvent(group.event);
    if (!event) return "error";

    const listChannel = await getGroupListChannel(event, user.guild);
    if (!listChannel) return "error";

    group.meta = JSON.stringify({
      ...JSON.parse(group.meta),
      location: values[0],
    });
    group = await group.save();

    const listId = message.embeds.at(0)?.footer?.text;
    if (listId) {
      await (
        await getGroupListMessage(listChannel, listId)
      ).edit(sendGroupListMessage(event, group, false));
    }

    await message.edit(
      sendControlPanel(await group.save(), event, listId, false)
    );
  }
);
