import { Client, GuildMember, TextBasedChannels } from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { getMember } from "../methods/getMember";
import { Logger } from "../methods/logger";

export type TypingCallback = (
  this: TypingTrigger,
  channel: TextBasedChannels,
  user: GuildMember,
) => Promise<any> | void;

export class TypingTrigger extends BaseTrigger {
  static #registered: TypingTrigger[] = [];

  #method: TypingCallback;

  constructor(options: { filters?: Filter[] }, method: TypingCallback) {
    super("text-channels", options.filters);
    this.#method = method.bind(this);

    TypingTrigger.#registered.push(this);
  }

  execute(channel: TextBasedChannels, user: GuildMember) {
    return this.#method(channel, user);
  }

  static registerTrigger(bot: Client) {
    bot.on("typingStart", async (typing) => {
      if (typing.user.bot) return;
      if (!typing.guild || !typing.channel) return;

      const user = getMember(typing);
      if (!user) return;

      await Promise.allSettled(
        TypingTrigger.#registered.map(async (trigger) => {
          const [canExecute, errorMessage] = await trigger.canExecute(user, typing.channel)

          if (!canExecute) {
            if (errorMessage) Logger.warn(
              `Failed to execute TypingTrigger: ${errorMessage}`
            );
            return;
          }

          return await trigger.execute(typing.channel, user);
        })
      );
    });
  }
}

const _: TriggerConstructor = TypingTrigger;
