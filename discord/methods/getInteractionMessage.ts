import { Message, MessageComponentInteraction } from "discord.js";

export const getInteractionMessage = (interaction: MessageComponentInteraction) => {
  return interaction.message instanceof Message ? interaction.message : new Message(interaction.client, interaction.message)
}