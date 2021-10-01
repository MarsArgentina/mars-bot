import { MessageButton, MessageSelectMenu } from "discord.js";
import {
  AgeRange,
  ageRangeToString,
  stringAsAgeRange,
  UserModel,
} from "temporary-database";
import { sendMainMessage } from ".";
import { component } from "../../../discord/methods/component";
import { getFlow } from "../../../discord/methods/flow";
import { getInteractionMessage } from "../../../discord/methods/getInteractionMessage";
import { getValidatedRole } from "../../../discord/methods/getServerRoles";
import { Logger } from "../../../discord/methods/logger";
import { ButtonTrigger, OptionsTrigger } from "../../../discord/triggers";
import { cancelButton } from "./cancelAction";
import { deleteContinueHere } from "./continueHere";

export const setAgeRangeButton = (disabled?: boolean) => {
  return new MessageButton({
    customId: "setAgeRange",
    label: "Cambiar Rango de Edad",
    style: "SECONDARY",
    disabled,
  });
};

new ButtonTrigger(
  {
    id: "setAgeRange",
  },
  async (channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;
    const message = getInteractionMessage(interaction);

    const flow = await getFlow(channel);
    const [User] = await UserModel.addFromDiscord(flow.user);

    await message.edit(sendMainMessage(User, true, false));

    await Promise.allSettled([
      message.reply({
        content: "Por favor selecciona tu rango de edad",
        components: component(
          [AgeRangeSelect(User.ageRange)],
          cancelButton({ label: "Cancelar", style: "DANGER" })
        ),
      }),
      deleteContinueHere(flow, user),
    ]);
  }
);

export const AgeRangeSelect = (initial?: AgeRange, id = "ageRangeSelector") => {
  return new MessageSelectMenu({
    customId: id,
    placeholder: ageRangeToString(initial ?? AgeRange.unspecified),
    options: ([2, 3, 4, 5, 6, 7] as const).map((value: AgeRange) => ({
      label: ageRangeToString(value),
      value: value.toString(),
      default: initial ? initial === value : false,
    })),
  });
};

new OptionsTrigger(
  {
    id: "ageRangeSelector",
  },
  async (values, channel, user, interaction) => {
    if (channel.type !== "GUILD_TEXT") return;
    const action = getInteractionMessage(interaction);
    const reference = action?.reference?.messageId;
    if (!reference) return;
    await action.delete();

    const embedMessage = await channel.messages.fetch(reference);
    const reaction = await embedMessage.react("💬");

    const ageRange = stringAsAgeRange(values[0]);

    const flow = await getFlow(channel);

    const [User] = await UserModel.addFromDiscord(flow.user);
    User.ageRange = ageRange;
    await User.save();

    await Promise.allSettled([
      deleteContinueHere(flow, user),
      embedMessage.edit(sendMainMessage(User, false, false)),
    ]);

    const validated = getValidatedRole(flow.user.guild);

    if (validated && !flow.user.roles.cache.has(validated.id)) {
      Logger.info(`<@${flow.user.id}> se ha validado.`)
      await flow.user.roles.add(validated);
    }

    await reaction.remove();
  }
);
