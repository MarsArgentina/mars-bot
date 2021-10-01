import { GuildMember } from "discord.js";
import { ChannelFilter } from "../../../discord/filters";
import { findLastMessage } from "../../../discord/filters/reply";
import { escapeRegexp } from "../../../discord/methods/escapeRegexp";
import { Flow, getFlow, hasFlow } from "../../../discord/methods/flow";
import { TypingTrigger } from "../../../discord/triggers";

export const deleteContinueHere = async (flow: Flow, user: GuildMember) => {
  if (user.id !== flow.user.id) return;
  const message = await findLastMessage(flow.channel, { limit: 10 });
  if (!message) return;

  if (
    message.content.includes("podes acceder al") &&
    message.content.endsWith("completando tus datos en este canal.")
  ) {
    await message.delete();
  }
};

export const canContinue = async (event: string, user: GuildMember) => {
  const previousFlow = await hasFlow(new RegExp(`^evento-${escapeRegexp(event)}`, "i"), user);

  if (previousFlow) {
    await previousFlow.channel.send(
      `<@${user.id}> podes acceder al ${event} completando tus datos en este canal.`
    );
    return previousFlow;
  }

  return null;
};

new TypingTrigger(
  {
    filters: [new ChannelFilter({ channel: /^evento\-/ })],
  },
  async (channel, user) => {
    if (channel.type !== "GUILD_TEXT") return;
    const flow = await getFlow(channel);

    await deleteContinueHere(flow, user);
  }
);
