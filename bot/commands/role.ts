import { UserModel } from "temporary-database";
import { AdminFilter } from "../../discord/filters";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { CommandTrigger } from "../../discord/triggers";

new CommandTrigger(
  {
    name: "role",
    description: "Otorga un rol a un usuario dado.",
    parameters: "<rol> <@usuario>",
    alias: ["rol"],
    filters: [
      new AdminFilter(
        "Este comando solo puede ser usado por un administrador."
      ),
    ],
  },
  async (message, { parameters }) => {
    const member = getMemberFromMessage(message);
    if (!member) return;

    const roles = parameters.filter((text) => /^\d+$/.test(text));

    const users = message.mentions.members;

    if (!users)
      return await message.reply(
        "No encontrado usuarios mensionados en este mensaje."
      );

    if (roles.length <= 0)
      return await message.reply(
        "No has brindado un rol para dar a estos usuarios."
      );

    await Promise.allSettled(
      users.map(async (user) => {
        const db = await UserModel.findFromDiscord(user.id);

        if (!db) throw new Error("Usuario no encontrado en la base de datos.");

        db.roles = Array.from(new Set([...db.roles, ...roles]).values());
        await db.save();
      })
    );
  }
);
