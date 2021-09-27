import { AwesomeQR } from "awesome-qr";
import { MessageAttachment, MessageEmbed } from "discord.js";
import fs from "fs/promises";
import { helpers } from "temporary-database";
import { CommandTrigger } from "../../discord/triggers";
import { RoleFilter } from "../../discord/filters";
import { fileURLToPath, URL } from 'url';

const url = new URL("../../static/logo_gris.png", import.meta.url)
const logo = fs.readFile(fileURLToPath(url));

const components = {
  data: { scale: 1 },
  timing: { scale: 1, protectors: true },
  alignment: { scale: 1, protectors: true },
  cornerAlignment: { scale: 1, protectors: true },
};

export const generateQR = async (text: string) => {
  const result = await new AwesomeQR({
    text,
    components,
    size: 1000,
    logoImage: await logo,
    logoScale: 0.4,
    logoCornerRadius: 10,
    correctLevel: AwesomeQR.CorrectLevel.H,
    margin: 100,
  }).draw();

  if (!result) return;

  return helpers.guaranteeBuffer(result);
};

export default new CommandTrigger(
  {
    name: "qr",
    parameters: "<contenido>",
    description: "Crea un codigo QR con el `contenido` dado.",
    filters: [
      new RoleFilter({
        roles: ["TMSA"],
        adminBypass: true,
        error:
          "Este comando solo puede ser usado por miembros de la organización.",
      }),
    ],
  },
  async (message, { parameters }) => {
    const text = parameters.join(" ").trim();
    if (!text || text === "") {
      return await message.reply("No se especificó el contenido del código QR.");
    }

    const qr = await generateQR(text);
    if (!qr) {
      return await message.reply("Hubo un error al generar el código QR, intentalo de nuevo.");
    }

    const file = new MessageAttachment(qr, "qr.png");
    const exampleEmbed = new MessageEmbed()
      .setTitle(`Aquí está tu código QR!`)
      .setImage("attachment://qr.png");

    await message.reply({ embeds: [exampleEmbed], files: [file] });
  }
);
