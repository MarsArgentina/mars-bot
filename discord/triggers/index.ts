import { Client } from "discord.js";
import { ButtonTrigger } from "./button";
import { CommandTrigger } from "./command";
import { JoinTrigger } from "./join";
import { LeaveTrigger } from "./leave";
import { MessageTrigger } from "./message";
import { OptionsTrigger } from "./options";
import { ReactionsTrigger } from "./reactions";
import { TypingTrigger } from "./typing";

// This doesn't need to be async but just in case
export const registerTriggers = async (bot: Client) => {
  ButtonTrigger.registerTrigger(bot);
  CommandTrigger.registerTrigger(bot);
  JoinTrigger.registerTrigger(bot);
  LeaveTrigger.registerTrigger(bot);
  MessageTrigger.registerTrigger(bot);
  OptionsTrigger.registerTrigger(bot);
  ReactionsTrigger.registerTrigger(bot);
  TypingTrigger.registerTrigger(bot);

  // FIXME: In future version having these triggers would be great:
  // MessageUpdateTrigger, similar to MessageTrigger fires on update and deletion
  // VoiceStateTrigger ("join", "mute", "unmute", "leave")
};

export { ButtonTrigger } from "./button";
export { CommandTrigger } from "./command";
export { JoinTrigger } from "./join";
export { LeaveTrigger } from "./leave";
export { MessageTrigger } from "./message";
export { OptionsTrigger } from "./options";
export { ReactionsTrigger } from "./reactions";
export { TypingTrigger } from "./typing";
