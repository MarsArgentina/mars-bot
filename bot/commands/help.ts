import { CommandTrigger } from "../../discord/triggers";
import { isAdmin } from "../../discord/methods/getServerRoles";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { getPrefix } from "../../discord/methods/parseCommand";
import { helpers } from "temporary-database";

new CommandTrigger(
  {
    name: "help",
    description: "Muestra este mensaje.",
    alias: ["ayuda"],
  },
  async (message, { commands }) => {
    const prefix = getPrefix(message);

    const member = getMemberFromMessage(message);
    if (!member) return;

    const content = helpers
      .getFulfilledResults(
        await Promise.allSettled(
          [...commands.entries()].map(async ([name, command]) => {
            const help = command.help;

            if (!isAdmin(member) && help.hide)
              throw new Error("This command is hidden.");

            const [pass, error] = await command.canExecute(
              member,
              message.channel,
              message
            );
            if (!pass) throw new Error(`This command is not available. ${error}`);

            const alias = [name, ...(command.alias ?? [])]
              .map((name) => {
                return `\`${prefix}${name}${
                  !help.parameters ? "" : ` ${help.parameters}`
                }\``;
              })
              .join(" o ");

            return `${alias}\n> ${help.description}`;
          })
        )
      )
      .join("\n\n");

    return await message.reply(
      `Aca hay una lista de commandos que podes usar en este canal:\n\n${content}`
    );
  }
);
