import { GuildMember, TextBasedChannels, Message, User } from "discord.js";
import { Channels, Filter } from "./base";
import {
  resolveMatchFilter,
  MatchFilter,
  ResolvedMatchFilter,
} from "../methods/matchFilter";

export type ReplyOptions = {
  reference?: MatchFilter;
  limit?: number;
  author?: User | null;
  error?: string;
};

export const findLastMessage = async (
  channel: TextBasedChannels,
  options?: ReplyOptions,
  before?: Message
) => {
  const author =
    options?.author === undefined ? channel.client.user : options.author;

  return (
    await channel.messages.fetch({
      limit: options?.limit ?? 1,
      before: before?.id,
    })
  ).find((message) => {
    if (author && message.author !== author) return false;
    return true;
  });
};

export const findReferencedMessage = async (
  message: Message,
  options: ReplyOptions,
  channel?: Channels
) => {
  const author =
    options.author === undefined ? message.client.user : options.author;

  if (message.reference) {
    const reference = await message.fetchReference();
    if (author && reference.author !== author) return undefined;

    return reference;
  }

  if (!channel || channel.isVoice()) return undefined;

  return await findLastMessage(channel, options, message);
};

export class ReplyFilter extends Filter {
  readonly type = "text-channels";

  readonly match: ResolvedMatchFilter;
  #options: ReplyOptions;

  constructor(options?: ReplyOptions) {
    super(options?.error);

    this.match = resolveMatchFilter(options?.reference);
    this.#options = { ...(options ?? {}) };
  }

  async filter(user: GuildMember, channel: Channels, message?: Message) {
    try {
      if (!message) return false;

      if (!channel || channel.isVoice()) {
        console.log(
          "Possibly using a ChannelFilter on a Trigger that doesn't have a TextChannel. This filter will most likely return false."
        );
      }

      const reference = await findReferencedMessage(
        message,
        this.#options,
        channel
      );

      if (!reference) return false;

      if (typeof this.match === "boolean") return this.match;
      return this.match(reference);
    } catch (e) {
      return false;
    }
  }
}
