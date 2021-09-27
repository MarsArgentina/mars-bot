import { Client, GuildMember } from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { Logger } from "../methods/logger";

export type LeaveCallback = (
  this: LeaveTrigger,
  member: GuildMember
) => Promise<any> | void;

export class LeaveTrigger extends BaseTrigger {
  static #registered: LeaveTrigger[] = [];

  #method: LeaveCallback;
  constructor(options: { filters?: Filter[] }, method: LeaveCallback) {
    super("ignores-channels", options.filters);
    this.#method = method.bind(this);

    LeaveTrigger.#registered.push(this);
  }

  execute(member: GuildMember) {
    return this.#method(member);
  }

  static registerTrigger(bot: Client) {
    bot.on("guildMemberRemove", async (member) => {
      const user = member.partial ? await member.fetch() : member;

      await Promise.allSettled(
        LeaveTrigger.#registered.map(async (trigger) => {
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

const _: TriggerConstructor = LeaveTrigger;
