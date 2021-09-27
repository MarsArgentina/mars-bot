import { MessageButton } from "discord.js";
import { UserModel } from "temporary-database";
import { sendMainMessage } from ".";
import { getFlow, setWritePermission } from "../../../discord/methods/flow";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { ButtonTrigger } from "../../../discord/triggers";
import { deleteContinueHere } from "./continueHere";

new ButtonTrigger(
  {
    id: "cancelOnboardingAction",
  },
  async (channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;
    const action = getInteractionMessage(interaction);
    const reference = action?.reference?.messageId;
    if (!reference) return;
    await action.delete();

    const embedMessage = await channel.messages.fetch(reference);
    const reaction = await embedMessage.react("💬");

    const flow = await getFlow(channel);

    await setWritePermission(flow, false);

    await Promise.allSettled([
      embedMessage.edit(
        sendMainMessage(
          (
            await UserModel.addFromDiscord(flow.user)
          )[0],
          false,
          false
        )
      ),
      deleteContinueHere(flow, user),
    ]);
    await reaction.remove();
  }
);

export const cancelButton = ({
  label,
  style,
}: {
  label: string;
  style: "DANGER" | "SECONDARY" | "SUCCESS" | "PRIMARY";
}) => {
  return new MessageButton({
    customId: "cancelOnboardingAction",
    label,
    style,
  });
};
