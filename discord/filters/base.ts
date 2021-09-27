import { GuildMember, Message, TextBasedChannels, VoiceChannel } from "discord.js";

/* 
ORDER IS IMPORTANT
- text-channels: This means that the filter only works on TextBasedChannels
- all-channels: This means that the filter works on both TextBasedChannels and VoiceChannels
- ignores-channels: This means that the filter works regardless if a channel is even provided (it may be null)

This list goes from most inclusive (ignores-channels) to most exclusive (text-channels)
*/
export const FILTER_TYPES = ["ignores-channels", "all-channels", "text-channels"] as const

export type FilterType = (typeof FILTER_TYPES)[number]

export type Channels = TextBasedChannels|VoiceChannel|null;

export class Filter {
  readonly type: FilterType = "ignores-channels";
  readonly errorMessage?: string;

  constructor (error?: string) {
    this.errorMessage = error;
  }

  public async filter (user: GuildMember, channel: Channels, message?: Message): Promise<boolean> {
    return true
  }
}
