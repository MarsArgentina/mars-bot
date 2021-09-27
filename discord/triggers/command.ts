import { Client, Message } from "discord.js";
import { TriggerConstructor, BaseTrigger } from "./base";
import { Filter } from "../filters/base";

import { getMemberFromMessage } from "../methods/getMember";
import { getSystemChannel } from "../methods/getChannels";
import { getUserGuild } from "../methods/getUserGuild";
import { getPrefix, parseCommand } from "../methods/parseCommand";

export type CommandProps = {
  name: string;
  parameters: string[];
  commands: Map<string, CommandTrigger>;
};

export type CommandOptions = {
  name: string;
  alias?: string[];
  filters?: Filter[];
  description: string;
  parameters?: string;
  hide?: boolean;
};

export type CommandCallback = (
  this: CommandTrigger,
  message: Message,
  props: CommandProps
) => Promise<any> | void;

export class CommandTrigger extends BaseTrigger {
  static #registered = new Map<string, CommandTrigger>();
  static #commands = new Map<string, CommandTrigger>();

  #method: CommandCallback;
  #options: CommandOptions;

  constructor(options: CommandOptions, method: CommandCallback) {
    super("text-channels", options.filters);
    this.#method = method.bind(this);
    this.#options = {
      ...options,
    };

    delete this.#options.filters;

    CommandTrigger.#registered.set(options.name, this);

    CommandTrigger.#commands.set(options.name, this);
    options.alias?.forEach((name) => {
      CommandTrigger.#commands.set(name, this);
    });
  }

  get name() {
    return this.#options.name;
  }

  get alias() {
    return this.#options.alias;
  }

  get help() {
    return {
      parameters: this.#options.parameters,
      description: this.#options.description,
      hide: this.#options.hide ?? false,
    };
  }

  execute(message: Message, props: CommandProps) {
    return this.#method(message, props);
  }

  static async registerTrigger(bot: Client) {
    bot.on("messageCreate", async (message) => {
      if (message.author.bot) return;

      const [name, ...parameters] = parseCommand(message);
      if (!name) return;

      const command = CommandTrigger.#commands.get(name);
      if (!command) return;

      const user = getMemberFromMessage(message);
      if (!user) return;

      if (!(await command.canExecute(user, message.channel, message))) return;
      const [canExecute, errorMessage] = await command.canExecute(
        user,
        message.channel,
        message
      );

      if (!canExecute) {
        if (errorMessage) await message.reply(errorMessage);
        return;
      }
      
      await message.react("🤖");

      const commands = CommandTrigger.#registered;

      try {
        return await command.execute(message, {
          name,
          parameters,
          commands,
        });
      } catch (e: unknown) {
        console.error(e);
        if (!(e instanceof Error)) return;

        const guild = message.guild ?? getUserGuild(message.author, bot);
        if (!guild) return;

        const system = getSystemChannel(guild);
        if (!system) return;

        return await system.send({
          embeds: [
            {
              title: `Error on ${getPrefix(message)}${name}`,
              description: `**Error Message:** ${e.message}`,
              color: "RED",
              fields: [
                {
                  name: "User",
                  value: `@${message.author.username}#${message.author.discriminator}`,
                  inline: true,
                },
              ],
            },
          ],
        });
      }
    });
  }
}

const _: TriggerConstructor = CommandTrigger;
