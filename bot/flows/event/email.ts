import { MessageButton } from "discord.js";
import { UserModel } from "temporary-database";
import { cancelButton } from "./cancelAction";
import { ChannelFilter, ReplyFilter } from "../../../discord/filters";
import {
  findReferencedMessage,
  ReplyOptions,
} from "../../../discord/filters/reply";
import { component } from "../../../discord/methods/component";
import { getFlow, setWritePermission } from "../../../discord/methods/flow";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { ButtonTrigger, MessageTrigger } from "../../../discord/triggers";
import { deleteContinueHere } from "./continueHere";
import { getEventFromEmbed, sendEventMessage } from "./start";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";

export const setEmailButtons = (hasEmail: boolean, disabled?: boolean) => {
  const buttons: MessageButton[] = [
    new MessageButton({
      customId: "setEventEmail",
      style: "SECONDARY",
      label: hasEmail ? "Cambiar E-mail" : "Configurar E-mail",
      disabled,
    }),
  ];

  if (hasEmail) {
    buttons.push(
      new MessageButton({
        customId: "unlinkEmail",
        style: "DANGER",
        label: "Desvincular E-mail",
        disabled,
      })
    );
  }

  return buttons;
};

const changeEmailText = "Ingresa el e-mail";

new ButtonTrigger(
  {
    id: "setEventEmail",
  },
  async (channel, user, interaction) => {
    const message = getInteractionMessage(interaction);

    if (channel.type !== "GUILD_TEXT") return;
    const flow = await getFlow(channel);

    const event = await getEventFromEmbed(message);
    if (!event) return;

    await Promise.allSettled([
      message.edit(
        await sendEventMessage(
          event,
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
        content: changeEmailText,
        components: component(
          cancelButton({ label: "Cancelar", style: "DANGER" })
        ),
      }),
      setWritePermission(flow, true),
    ]);
  }
);

const replyOptions: ReplyOptions = {
  reference: `^${escapeRegexp(changeEmailText)}`,
  limit: 10,
};
new MessageTrigger(
  {
    filters: [
      new ChannelFilter({ channel: /^evento-/ }),
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

    await Promise.allSettled([message.delete(), action.delete()]);

    const flow = await getFlow(channel);
    const other = [
      setWritePermission(flow, false),
      deleteContinueHere(flow, user),
    ];

    const embedMessage = await channel.messages.fetch(reference);
    const reaction = await embedMessage.react("💬");

    const [User] = await UserModel.addFromDiscord(flow.user);
    const event = await getEventFromEmbed(embedMessage);
    if (!event) return;

    if (content.length > 1) {
      await User.setInvite(event, content);
    }
    await User.save();

    await Promise.allSettled([
      embedMessage.edit(await sendEventMessage(event, User, false, false)),
      ...other,
    ]);
    await reaction.remove();
  }
);

new ButtonTrigger({
  id: "unlinkEmail"
}, async (channel, user, interaction) => {
  if (channel.type !== "GUILD_TEXT") return;
  const embedMessage = getInteractionMessage(interaction);
  
  const flow = await getFlow(channel);
  const other = [
    deleteContinueHere(flow, user),
  ];

  const reaction = await embedMessage.react("💬");

  const [User] = await UserModel.addFromDiscord(flow.user);
  const event = await getEventFromEmbed(embedMessage);
  if (!event) return;

  await User.setInvite(event);
  await User.save();

  await Promise.allSettled([
    embedMessage.edit(await sendEventMessage(event, User, false, false)),
    ...other,
  ]);
  await reaction.remove();
})