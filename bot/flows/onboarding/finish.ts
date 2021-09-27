import { MessageButton } from "discord.js"
import { ButtonTrigger } from "../../../discord/triggers"

export const finishButton = (disabled?: boolean) => {
  return new MessageButton({
    customId: "finishOnboarding",
    label: "Finalizar",
    style: "SUCCESS",
    disabled
  })
}

new ButtonTrigger({
  id: "finishOnboarding",
}, async (channel, user, interaction) => {
  await channel.delete()
})