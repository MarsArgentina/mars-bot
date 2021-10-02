import { MessageButton, MessageEmbed } from "discord.js";
import { GroupModel, UserModel, EventModel } from "temporary-database";
import { component } from "../../../discord/methods/component";
import { newFlow } from "../../../discord/methods/flow";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { Logger } from "../../../discord/methods/logger";
import { ButtonTrigger } from "../../../discord/triggers";
import { acceptRequestButton } from "./acceptRequest";
import { canContinue } from "./continueHere";
import { rejectRequestButton } from "./rejectRequest";

export const requestJoinButton = () => {
  return new MessageButton({
    label: "Solicitar Unirse",
    customId: "joinGroup",
    style: "SECONDARY",
  });
};

new ButtonTrigger(
  {
    id: "joinGroup",
    dontUpdate: true,
  },
  async (channel, member, interaction) => {
    const message = getInteractionMessage(interaction);

    const id = message.embeds.at(0)?.footer?.text;
    if (!id) {
      return await interaction.reply({
        content: "No encontré el grupo al que querés unirte.",
        ephemeral: true,
      }).catch(() => {});
    }

    const group = await GroupModel.findById(id);
    if (!group) {
      return await interaction.reply({
        content: "No encontré el grupo al que querés unirte.",
        ephemeral: true,
      }).catch(() => {});
    }

    const user = await UserModel.findFromDiscord(member.id);
    if (!user) {
      Logger.warn(
        `No pude encontrar al usuario <@${member.id}> en la base de datos. Esto sucedio al intentar solicitar unirse al grupo ${group.name}.`
      );
      return await interaction.reply({
        content:
          "Hubo un error inesperado, no te preocupes ya he avisado a los organizadores. Prueba de nuevo más tarde.",
        ephemeral: true,
      }).catch(() => {});
    }

    const invite = await user.getInvite(group.event, false);
    if (!invite) {
      return await interaction.reply({
        content:
          "Al parecer no tenés una invitación a este evento, por lo cual no podes formar parte de un grupo.",
        ephemeral: true,
      }).catch(() => {});
    }

    if (group.hasInvite(invite)) {
      return await interaction.reply({
        content: `Ya formas parte de este grupo. Podes hablar con otros integrantes en <#${group.mainChannel}>`,
        ephemeral: true,
      }).catch(() => {});
    }

    if (invite.group) {
      return await interaction.reply({
        content:
          "Ya formas parte de un grupo en este evento, deberás abandonarlo antes de poder unirte a otro.",
        ephemeral: true,
      }).catch(() => {});
    }

    const event = await EventModel.fetchEvent(group.event);
    if (!event) {
      return await interaction.reply({
        content: "No pude encontrar el evento al que pertenece este grupo.",
        ephemeral: true,
      }).catch(() => {});
    }

    const groupChannel = await member.guild.channels.fetch(group.mainChannel);
    if (!groupChannel?.isText()) {
      return await interaction.reply({
        content:
          "No pude mandar tu solicitud. El canal de este grupo no existe",
        ephemeral: true,
      }).catch(() => {});
    }

    await interaction.deferUpdate().catch(() => {});

    if (await canContinue(member, event.name)) return;

    const flow = await newFlow(
      member,
      `grupo-${event.name}-${member.user.username}-${member.user.discriminator}`,
      "unirte a un grupo"
    );

    const { image, file } = getFullWidth();
    const requestEmbed = new MessageEmbed()
      .setTitle("Solicitud de Acceso")
      .setDescription(`<@${member.id}> ha solicitado unirse a este grupo.`)
      .setColor("BLUE")
      .setImage(image)
      .setFooter("");

    const request = await groupChannel.send({
      embeds: [requestEmbed],
      files: [file],
      components: component(
        acceptRequestButton(),
        rejectRequestButton(),
      ),
    });

    const requestInfoEmbed = new MessageEmbed()
      .setTitle("Solicitud de Grupo")
      .setDescription(`Has solicitado unirte a **${group.name}**`)
      .setImage(image)
      .setFooter(`${groupChannel.id}/${request.id}`);

    await flow.channel.send({
      embeds: [requestInfoEmbed],
      files: [file],
      components: component(
        new MessageButton({
          customId: "cancelRequest",
          label: "Cancelar Solicitud",
          style: "DANGER",
        })
      ),
    });
  }
);

new ButtonTrigger(
  {
    id: "cancelRequest",
  },
  async (channel, user, interaction) => {
    const message = getInteractionMessage(interaction);

    const requestDirection = message.embeds.at(0)?.footer?.text;
    if (!requestDirection) {
      return await interaction.reply({
        content: "No pude encontrar esta solicitud.",
        ephemeral: true,
      }).catch(() => {});
    }

    const [channelId, messageId] = requestDirection.split("/", 2);

    const groupChannel = await user.guild.channels.fetch(channelId);
    if (!groupChannel?.isText()) {
      return await interaction.reply({
        content:
          "No pude mandar tu solicitud. El canal de este grupo no existe",
        ephemeral: true,
      }).catch(() => {});
    }

    const request = await groupChannel.messages.fetch(messageId);

    await Promise.allSettled([channel.delete(), request.delete()]);
  }
);
