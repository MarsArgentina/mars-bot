import { GuildMember, Message } from "discord.js";
import { Channels, Filter } from "./base";
import { isAdmin } from "../methods/getServerRoles";

export class AdminFilter extends Filter {
  readonly type = "ignores-channels";

  async filter (user: GuildMember, channel: Channels, message?: Message) {
    return isAdmin(user)
  }
}