import fetch from "node-fetch";
import path from "path";
import { EventModel, importers } from "temporary-database";
import { guaranteeError } from "temporary-database/dist/helpers";
import { AdminFilter } from "../../discord/filters";
import { CommandTrigger } from "../../discord/triggers";
import { updateUser } from "../update";
import { setImmediate } from "timers/promises";

new CommandTrigger(
  {
    name: "import-old",
    description: "Importa una tabla de usuarios creada de información antigua.",
    parameters: "<evento?> [adjunto: tabla.xlsx]",
    filters: [new AdminFilter()],
  },
  async (message, { parameters }) => {
    const attachment = message.attachments.find((attachment) => {
      const ext = path.extname(attachment.name ?? "");

      if (ext === ".xlsx") return true;

      return false;
    });

    if (!attachment) {
      return await message.reply(
        "Este comando necesita que adjuntes un archivo con extensión .xlsx (Tabla de Excel) para importar la información"
      );
    }

    const event = await EventModel.findOne({
      name: parameters[0] ?? "NSAC-2020",
    });

    if (!event)
      return await message.reply(
        `Event "${parameters[0] ?? "NSAC-2020"}" not found in database`
      );

    try {
      const file = await fetch(attachment.url);

      const buffer = await file.buffer();

      try {
        const result = await importers.importFromOldData(event, buffer, {
          name: true,
          userMeta: true,
          inviteMeta: true,
          role: true,
        });

        await Promise.allSettled(
          result.users.map(async (entry) => {
            await setImmediate();
            const user = await message.guild?.members.fetch(entry.discordId);
            if (user) await updateUser(user, entry);
          })
        );
      } catch (e) {
        return await message.reply(
          `Hubo un problema al importar la información: ${guaranteeError(e)}`
        );
      }
    } catch (e) {
      return await message.reply(
        `Hubo un problema al descargar el archivo adjunto: ${
          guaranteeError(e).message
        }`
      );
    }

    //TODO: import groups LEAVE THIS FOR LATER!!
  }
);
