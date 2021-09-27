import { MessageButton } from "discord.js";
import { ButtonTrigger } from "../../../discord/triggers";

export const finishButton = (email: boolean, disabled?: boolean) => {
  return new MessageButton({
    customId: "finishEvent",
    label: email ? "Finalizar" : "Cancelar",
    style: email ? "SUCCESS" : "DANGER",
    disabled,
  });
};


new ButtonTrigger(
  {
    id: "finishEvent",
  },
  async (channel, user, interaction) => {
    await channel.delete();
  }
);
