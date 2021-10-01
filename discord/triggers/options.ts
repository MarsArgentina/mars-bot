import {
  Client,
  TextBasedChannels,
  GuildMember,
  SelectMenuInteraction,
} from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { getAPIMessage } from "../methods/getAPIMessage";

import { getMember } from "../methods/getMember";
import { Logger } from "../methods/logger";
import { getSystemChannel } from "../methods/getChannels";

export type OptionsCallback = (
  values: string[],
  channel: TextBasedChannels,
  user: GuildMember,
  interaction: SelectMenuInteraction
) => Promise<any | void> | void | any;

export class OptionsTrigger extends BaseTrigger {
  static #registered = new Map<string, OptionsTrigger>();

  #method: OptionsCallback;
  #id: string;
  #dontUpdate: boolean;

  constructor(
    options: {
      id: string;
      dontUpdate?: boolean;
      filters?: Filter[];
    },
    method: OptionsCallback
  ) {
    super("text-channels", options.filters);
    this.#id = options.id;
    this.#dontUpdate = Boolean(options.dontUpdate);
    this.#method = method.bind(this);

    OptionsTrigger.#registered.set(options.id, this);
  }

  get dontUpdate() {
    return Boolean(this.#dontUpdate);
  }

  get id() {
    return this.#id;
  }

  execute(
    values: string[],
    channel: TextBasedChannels,
    user: GuildMember,
    interaction: SelectMenuInteraction
  ) {
    return this.#method(values, channel, user, interaction);
  }

  static registerTrigger(bot: Client) {
    bot.on("interactionCreate", async (interaction) => {
      if (interaction.user.bot) return;
      if (!interaction.isSelectMenu()) return;
      if (!interaction.guild || !interaction.channel) return;

      const trigger = OptionsTrigger.#registered.get(interaction.customId);
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
      try {
        return await trigger.execute(
          interaction.values,
          interaction.channel,
          user,
          interaction
        );
      } catch (e: unknown) {
        console.error(e);
        if (!(e instanceof Error)) return;

        const system = getSystemChannel(user.guild);
        if (!system) return;

        return await system.send({
          embeds: [
            {
              title: `Error on ButtonTrigger ${interaction.customId}`,
              description: `**Error Message:** ${e.message}`,
              color: "RED",
              fields: [
                {
                  name: "User",
                  value: `<@${user.id}>`,
                  inline: true,
                },
              ],
            },
          ],
        });
      }
    });
  }
}

const _: TriggerConstructor = OptionsTrigger;
