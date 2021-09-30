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
    message.content.endsWith("antes de solicitar unirte a otro grupo deberás cancelar la solicitud actual.")
  ) {
    await message.delete();
  }
};

export const canContinue = async (user: GuildMember, event: string) => {
  const previousFlow = await hasFlow(new RegExp(`^${escapeRegexp(`grupo-${event}`)}`, "i"), user);

  if (previousFlow) {
    await previousFlow.channel.send(
      `<@${user.id}> antes de solicitar unirte a otro grupo deberás cancelar la solicitud actual.`
    );
    return true;
  }

  return false;
};

new TypingTrigger(
  {
    filters: [new ChannelFilter({ channel: /^grupo/ })],
  },
  async (channel, user) => {
    if (channel.type !== "GUILD_TEXT") return;
    const flow = await getFlow(channel);

    await deleteContinueHere(flow, user);
  }
);
