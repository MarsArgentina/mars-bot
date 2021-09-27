import {
  Client,
  GuildMember,
  TextBasedChannels,
  Message,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";
import { getMemberFromGuild } from "../methods/getMember";
import { getUserGuild } from "../methods/getUserGuild";

export type ReactionCallback = (
  this: ReactionsTrigger,
  method: "add" | "remove",
  reaction: MessageReaction,
  channel: TextBasedChannels,
  user: GuildMember,
  message: Message
) => Promise<any> | void;

export class ReactionsTrigger extends BaseTrigger {
  static #registered: ReactionsTrigger[] = [];

  #method: ReactionCallback;

  constructor(options: { filters?: Filter[] }, method: ReactionCallback) {
    super("text-channels", options.filters);
    this.#method = method.bind(this);

    ReactionsTrigger.#registered.push(this);
  }

  execute(
    method: "add" | "remove",
    reaction: MessageReaction,
    channel: TextBasedChannels,
    user: GuildMember,
    message: Message
  ) {
    return this.#method(method, reaction, channel, user, message);
  }

  static registerTrigger(bot: Client) {
    const listener =
      (method: "add" | "remove") =>
      async (
        rawReaction: MessageReaction | PartialMessageReaction,
        rawUser: User | PartialUser
      ) => {
        if (rawUser.bot) return;

        const reaction = rawReaction.partial
          ? await rawReaction.fetch()
          : rawReaction;
        const message = reaction.message.partial
          ? await reaction.message.fetch()
          : reaction.message;
        const tempUser = rawUser.partial ? await rawUser.fetch() : rawUser;

        const guild = message.guild ?? getUserGuild(tempUser, bot);
        if (!guild) return;

        const user = getMemberFromGuild(guild, tempUser);
        if (!user) return;

        await Promise.allSettled(
          ReactionsTrigger.#registered.map(async (trigger) => {
            const [canExecute, errorMessage] = await trigger.canExecute(
              user,
              message.channel,
              message
            );

            if (!canExecute) {
              if (errorMessage) await message.reply(errorMessage);
              return;
            }

            return await trigger.execute(
              method,
              reaction,
              message.channel,
              user,
              message
            );
          })
        );
      };

    bot.on("messageReactionAdd", listener("add"));
    bot.on("messageReactionRemove", listener("remove"));
  }
}

const _: TriggerConstructor = ReactionsTrigger;
