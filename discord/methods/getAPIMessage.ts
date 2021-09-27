import { APIMessage } from "discord-api-types";
import { Client, Message } from "discord.js";

export function getAPIMessage(bot: Client, message: Message | APIMessage) {
  return message instanceof Message ? message : new Message(bot, message);
}