import { Client, GuildMember, TextBasedChannels, Message } from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { getMemberFromMessage } from "../methods/getMember";

export type MessageCallback = (
  this: MessageTrigger,
  channel: TextBasedChannels,
  user: GuildMember,
  message: Message
) => Promise<any> | void;

export class MessageTrigger extends BaseTrigger {
  static #registered: MessageTrigger[] = [];

  #method: MessageCallback;

  constructor(options: { filters?: Filter[] }, method: MessageCallback) {
    super("text-channels", options.filters);
    this.#method = method.bind(this);

    MessageTrigger.#registered.push(this);
  }

  execute(channel: TextBasedChannels, user: GuildMember, message: Message) {
    return this.#method(channel, user, message);
  }

  static registerTrigger(bot: Client) {
    bot.on("messageCreate", async (message) => {
      if (message.author.bot) return;
      if (!message.guild || !message.channel) return;

      const user = getMemberFromMessage(message);
      if (!user) return;

      await Promise.allSettled(
        MessageTrigger.#registered.map(async (trigger) => {
          const [canExecute, errorMessage] = await trigger.canExecute(user, message.channel, message)

          if (!canExecute) {
            if (errorMessage) await message.reply(errorMessage);
            return;
          }

          return await trigger.execute(message.channel, user, message);
        })
      );
    });
  }
}

const _: TriggerConstructor = MessageTrigger;
