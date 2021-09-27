import { GuildMember, Message } from "discord.js";
import { Channels, Filter } from "./base";
import { Flow, getFlow } from "../methods/flow";

export type FlowCallback = (
  flow: Flow,
  user: GuildMember,
  message?: Message
) => Promise<boolean> | boolean;

export class FlowFilter extends Filter {
  readonly type = "text-channels";
  
  readonly match: FlowCallback;

  constructor(options?: {flow?: FlowCallback, error?: string}) {
    super(options?.error);

    this.match = options?.flow ?? (() => true);
  }

  async filter(user: GuildMember, channel: Channels, message: Message) {
    try {
      if (!channel) {
        console.log(
          "Possibly using a FlowFilter on a Trigger that doesn't have a channel. This filter will always return false."
        );
        return false;
      }
      if (channel.type !== "GUILD_TEXT") return false;

      const flow = await getFlow(channel);

      return await this.match(flow, user, message);
    } catch (e) {
      return false;
    }
  }
}
