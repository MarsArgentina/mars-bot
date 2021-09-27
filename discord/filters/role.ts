import { GuildMember, Message } from "discord.js";
import { Channels, Filter } from "./base";
import { isAdmin } from "../methods/getServerRoles";
import { hasRole } from "../methods/hasRole";
import { MatchFilter } from "../methods/matchFilter";

export class RoleFilter extends Filter {
  readonly type = "ignores-channels";

  readonly roles: MatchFilter;
  readonly adminBypass: boolean

  constructor (options?: {roles?: MatchFilter, adminBypass?: boolean, error?: string}) {
    super(options?.error);

    this.roles = options?.roles;
    this.adminBypass = options?.adminBypass ?? true;
  }

  async filter (user: GuildMember, channel: Channels, message?: Message) {
    if (this.adminBypass && isAdmin(user)) return true;

    return hasRole(user.guild, user.user, this.roles)
  }
}