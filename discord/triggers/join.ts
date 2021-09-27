import { Client, GuildMember } from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { Logger } from "../methods/logger";

export type JoinCallback = (
  this: JoinTrigger,
  member: GuildMember
) => Promise<any> | void;

export class JoinTrigger extends BaseTrigger {
  static #registered: JoinTrigger[] = [];

  #method: JoinCallback;
  constructor(options: { filters?: Filter[] }, method: JoinCallback) {
    super("ignores-channels", options.filters);
    this.#method = method.bind(this);

    JoinTrigger.#registered.push(this);
  }

  execute(member: GuildMember) {
    return this.#method(member);
  }

  static registerTrigger(bot: Client) {
    bot.on("guildMemberAdd", async (user) => {
      await Promise.allSettled(
        JoinTrigger.#registered.map(async (trigger) => {
          const [canExecute, errorMessage] = await trigger.canExecute(
            user,
            null
          );
          if (!canExecute) {
            if (errorMessage)
              Logger.warn(`Failed to execute JoinTrigger: ${errorMessage}`);
            return;
          }

          await trigger.execute(user);
        })
      );
    });
  }
}

const _: TriggerConstructor = JoinTrigger;
