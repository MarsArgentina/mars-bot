import { GuildMember, Message } from "discord.js";
import { Channels, Filter } from "./base";
import { isAdmin } from "../methods/getServerRoles";
import { isValidChannel } from "../methods/isValidChannel";
import { MatchFilter } from "../methods/matchFilter";

export class ChannelFilter extends Filter {
  readonly type = "all-channels";
  
  readonly channels: MatchFilter;
  readonly allowThreads: boolean;
  readonly allowVoice: boolean;
  readonly adminBypass: boolean;

  constructor(
    options?: { channel?: MatchFilter, allowThreads?: boolean; allowVoice?: boolean; adminBypass?: boolean, error?: string }
  ) {
    super(options?.error)

    this.channels = options?.channel;
    this.allowThreads = options?.allowThreads ?? false;
    this.allowVoice = options?.allowVoice ?? true;
    this.adminBypass = options?.adminBypass ?? true;
  }

  async filter(user: GuildMember, channel: Channels, message?: Message) {
    if (!channel) {
      console.log(
        "Possibly using a ChannelFilter on a Trigger that doesn't have a channel. This filter will always return false."
      );
      return false;
    }

    if (this.adminBypass && isAdmin(user)) return true;

    return isValidChannel(channel, this.channels, this.allowThreads, this.allowVoice);
  }
}
