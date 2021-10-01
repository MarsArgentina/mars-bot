import { GuildMember, Message } from "discord.js";
import { EventModel, GroupModel } from "temporary-database";
import { Channels, Filter } from "./base";

export class GroupChannelFilter extends Filter {
  readonly type = "text-channels";

  #canBeUsedInCommands: boolean;

  constructor(options?: { canBeUsedInCommands?: boolean; error?: string }) {
    super(options?.error);
    this.#canBeUsedInCommands = options?.canBeUsedInCommands ?? true;
  }

  public async filter(
    user: GuildMember,
    channel: Channels,
    message?: Message
  ): Promise<boolean> {
    if (channel?.type !== "GUILD_TEXT") return false;

    const group = await GroupModel.findOne({ mainChannel: channel.id });
    if (group) return true;

    if (!this.#canBeUsedInCommands) return false;

    const category = channel.parentId;
    if (!category) return false;

    const event = await EventModel.findOne({ category });
    if (event) return true;

    return false;
  }
}
