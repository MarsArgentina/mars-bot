import { GuildMember, Message } from "discord.js";
import { Channels, Filter } from "./base";
import { resolveMatchFilter, MatchFilter, ResolvedMatchFilter } from "../methods/matchFilter";

export class MessageFilter extends Filter {
  readonly type = "ignores-channels";
  
  readonly match: ResolvedMatchFilter;
  
  constructor (options?: {message?: MatchFilter, error?: string}) {
    super(options?.error);
    this.match = resolveMatchFilter(options?.message);
  }

  async filter (user: GuildMember, channel: Channels, message?: Message) {
    try {
      if (!message) return false;

      if (typeof this.match === "boolean") return this.match;

      return this.match(message)
    } catch (e) {
      return false;
    }
  }
}