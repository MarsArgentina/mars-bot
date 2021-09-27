import { MessageButton } from "discord.js";
import { UserModel } from "temporary-database";
import { ChannelFilter } from "../../../discord/filters";
import {
  findReferencedMessage,
  ReplyFilter,
  ReplyOptions,
} from "../../../discord/filters/reply";
import { component } from "../../../discord/methods/component";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";
import { getFlow, setWritePermission } from "../../../discord/methods/flow";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { Logger } from "../../../discord/methods/logger";
import { ButtonTrigger, MessageTrigger } from "../../../discord/triggers";
import { cancelButton } from "./cancelAction";
import { deleteContinueHere } from "./continueHere";
import { sendMainMessage } from "./start";

export const setDisplayNameButton = (disabled?: boolean) => {
  return new MessageButton({
    customId: "setDisplayName",
    label: "Cambiar Nombre de Pila",
    style: "SECONDARY",
    disabled,
  });
};

const changeDisplayNameText =
  "Ingresa tu nombre de pila (máximo 32 caracteres)";

new ButtonTrigger(
  {
    id: "setDisplayName",
  },
  async (channel, user, interaction) => {
    const message = getInteractionMessage(interaction);

    if (channel.type !== "GUILD_TEXT") return;
    const flow = await getFlow(channel);

    await Promise.allSettled([
      message.edit(
        sendMainMessage(
          (
            await UserModel.addFromDiscord(flow.user)
          )[0],
          true,
          false
        )
      ),
      deleteContinueHere(flow, user),
    ]);

    await Promise.allSettled([
      message.reply({
        content: changeDisplayNameText,
        components: component(
          cancelButton({ label: "Cancelar", style: "DANGER" })
        ),
      }),
      setWritePermission(flow, true),
    ]);
  }
);

const replyOptions: ReplyOptions = {
  reference: `^${escapeRegexp(changeDisplayNameText)}`,
  limit: 10,
};
new MessageTrigger(
  {
    filters: [
      new ChannelFilter({ channel: /^validación/ }),
      new ReplyFilter(replyOptions),
    ],
  },
  async (channel, user, message) => {
    if (channel.type !== "GUILD_TEXT") return;
    await message.react("💬");
    const action = await findReferencedMessage(message, replyOptions, channel);
    const reference = action?.reference?.messageId;
    if (!reference) return;

    const content = message.content.trim();
    if (content.length < 1) return await message.delete();

    if (content.length > 32)
      return await Promise.allSettled([
        action.edit(
          `${changeDisplayNameText}\n\nEl nombre de pila ingresado tiene ${content.length} caracteres y el máximo es **32**, intenta nuevamente.`
        ),
        message.delete(),
      ]);

    await Promise.allSettled([message.delete(), action.delete()]);

    const embedMessage = await channel.messages.fetch(reference);
    const reaction = await embedMessage.react("💬");
    
    const flow = await getFlow(channel);
    const other = [
      setWritePermission(flow, false),
      deleteContinueHere(flow, user),
    ];

    const [User] = await UserModel.addFromDiscord(flow.user);

    if (content.length <= 32) {
      await flow.user.setNickname(content).catch((e) => {
        Logger.warn(e);
      });
      User.displayName = content;
    }
    await User.save();

    await Promise.allSettled([
      embedMessage.edit(sendMainMessage(User, false, false)),
      ...other,
    ]);
    await reaction.remove();
  }
);
