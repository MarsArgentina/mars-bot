import { GuildMember } from "discord.js";
import { ChannelFilter } from "../../../discord/filters";
import { findLastMessage } from "../../../discord/filters/reply";
import { Flow, getFlow, hasFlow } from "../../../discord/methods/flow";
import { TypingTrigger } from "../../../discord/triggers";

export const deleteContinueHere = async (flow: Flow, user: GuildMember) => {
  if (user.id !== flow.user.id) return;
  const message = await findLastMessage(flow.channel, { limit: 10 });
  if (!message) return;

  if (
    message.content.endsWith("podes continuar con la validación en este canal.")
  ) {
    await message.delete();
  }
};

export const canContinue = async (user: GuildMember) => {
  const previousFlow = await hasFlow(/^validación/, user);

  if (previousFlow) {
    await previousFlow.channel.send(
      `<@${user.id}> podes continuar con la validación en este canal.`
    );
    return true;
  }

  return false;
};

new TypingTrigger(
  {
    filters: [new ChannelFilter({ channel: /^validación/ })],
  },
  async (channel, user) => {
    if (channel.type !== "GUILD_TEXT") return;
    const flow = await getFlow(channel);

    await deleteContinueHere(flow, user);
  }
);
