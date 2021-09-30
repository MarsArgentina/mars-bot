import {
  Client,
  TextBasedChannels,
  GuildMember,
  ButtonInteraction,
} from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";

import { getMember } from "../methods/getMember";
import { getAPIMessage } from "../methods/getAPIMessage";
import { Logger } from "../methods/logger";

export type ButtonCallback = (
  this: ButtonTrigger,
  channel: TextBasedChannels,
  user: GuildMember,
  interaction: ButtonInteraction
) => Promise<any | void> | void | any;

export class ButtonTrigger extends BaseTrigger {
  static #registered = new Map<string, ButtonTrigger>();

  #method: ButtonCallback;
  #id: string;
  #dontUpdate: boolean;

  constructor(
    options: { id: string; dontUpdate?: boolean; filters?: Filter[] },
    method: ButtonCallback
  ) {
    super("text-channels", options.filters);
    this.#id = options.id;
    this.#method = method.bind(this);
    this.#dontUpdate = Boolean(options.dontUpdate);

    ButtonTrigger.#registered.set(options.id, this);
  }

  get dontUpdate() {
    return Boolean(this.#dontUpdate);
  }

  get id() {
    return this.#id;
  }

  execute(
    channel: TextBasedChannels,
    user: GuildMember,
    interaction: ButtonInteraction
  ) {
    return this.#method(channel, user, interaction);
  }

  static registerTrigger(bot: Client) {
    bot.on("interactionCreate", async (interaction) => {
      if (interaction.user.bot) return;
      if (!interaction.isButton()) return;
      if (!interaction.guild || !interaction.channel) return;

      const trigger = ButtonTrigger.#registered.get(interaction.customId);
      if (!trigger) return;

      const user = getMember(interaction);
      if (!user) return;

      const message = getAPIMessage(bot, interaction.message);

      const [canExecute, errorMessage] = await trigger.canExecute(
        user,
        interaction.channel,
        message
      );

      if (!canExecute) {
        if (errorMessage)
          Logger.warn(
            `Failed to execute ButtonTrigger "${interaction.customId}": ${errorMessage}`
          );
        return;
      }

      if (!trigger.dontUpdate) await interaction.deferUpdate();
      await trigger.execute(interaction.channel, user, interaction);
    });
  }
}

const _: TriggerConstructor = ButtonTrigger;
