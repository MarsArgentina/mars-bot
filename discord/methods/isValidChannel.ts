import { NewsChannel, TextBasedChannels, TextChannel, VoiceChannel } from "discord.js";
import { ChannelTypes } from "discord.js/typings/enums";
import { resolveMatchFilter, MatchFilter } from "./matchFilter";

type Types = keyof typeof ChannelTypes;
const InvalidTypes = new Set(["UNKNOWN", "DM", "GROUP_DM"] as Types[]);

export const isValidChannel = (
  channel: TextBasedChannels|VoiceChannel,
  channels?: MatchFilter,
  allowThread = false,
  allowVoice = true
) => {
  if (InvalidTypes.has(channel.type)) return false;
  if (!allowVoice && channel.isVoice) return false;

  let guildChannel = channel as TextChannel|NewsChannel|VoiceChannel;
  
  if (channel.isThread() ) {
    if (!allowThread) return false;
    if (channel.parent === null) return false;

    guildChannel = channel.parent;
  }

  const filter = resolveMatchFilter(channels)
  if (typeof filter === "boolean") return filter;

  return !!filter(guildChannel.name)
};
