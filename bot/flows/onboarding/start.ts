import { MessageButton, MessageEmbed } from "discord.js";
import {
  AgeRange,
  ageRangeToString,
  UserDocument,
  UserModel,
} from "temporary-database";
import { ButtonTrigger, CommandTrigger } from "../../../discord/triggers";
import { AdminFilter } from "../../../discord/filters";

import { component } from "../../../discord/methods/component";
import { newFlow } from "../../../discord/methods/flow";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { getRulesChannel } from "../../../discord/methods/getChannels";

import { canContinue } from "./continueHere";
import { setAgeRangeButton } from "./ageRange";
import { setNameButton } from "./name";
import { setDisplayNameButton } from "./displayName";
import { finishButton } from "./finish";

new CommandTrigger(
  {
    name: "start",
    alias: ["iniciar"],
    description: "Envia el mensaje de validación al canal de reglas.",
    filters: [new AdminFilter()],
  },
  async (message, { parameters }) => {
    if (!message.guild)
      return await message.reply(
        "Este comando debe ser usado en el servidor de Discord."
      );

    const rules = getRulesChannel(message.guild);

    rules?.send({
      content:
        "Para tener acceso a los canales del servidor deberás realizar una validación.",
      components: component(
        new MessageButton({
          customId: "startValidation",
          style: "PRIMARY",
          label: "Comenzar Validación",
        })
      ),
    });
  }
);

const UNSPECIFIED = ageRangeToString(AgeRange.unspecified);

export const sendMainMessage = (
  User: UserDocument,
  disabled?: boolean,
  sendFiles = true
) => {
  const { file, image } = getFullWidth();

  const ageRange = ageRangeToString(User.ageRange ?? AgeRange.unspecified);

  const embed = new MessageEmbed()
    .setTitle("Datos Personales")
    .addField(
      "Rango de Edad",
      `
> **${ageRange === UNSPECIFIED ? `❌ ${ageRange}` : ageRange}**
> \u2800
> No te preocupes, este dato no será un limitante.
      `.trim()
    )
    .addField(
      "Nombre completo",
      `
> **${User.name}**
> \u2800
> Este nombre aparecerá en certificados y otros documentos.
      `.trim()
    )
    .setColor(
      ageRange === UNSPECIFIED ? "RED" : "GREEN"
    )
    .setImage(image);

  const components = [setAgeRangeButton(disabled), setNameButton(disabled)];

  if (User.displayName) {
    embed.addField(
      "Nombre de Pila",
      `
> **${User.displayName}**
> \u2800
> Este nombre es el que se mostrará en Discord y otras redes. Sugerimos que sea una versión más corta de tu nombre completo
      `.trim()
    );

    components.push(setDisplayNameButton(disabled));
  }

  if (ageRange !== UNSPECIFIED) {
    components.push(finishButton(disabled))
  }

  return {
    embeds: [embed],
    components: component(...components),
    files: sendFiles ? [file] : undefined,
  };
};

new ButtonTrigger(
  {
    id: "startValidation",
  },
  async (channel, user, interaction) => {
    if (await canContinue(user)) return;

    const flow = await newFlow(
      user,
      `validación-${user.user.username}-${user.user.discriminator}`,
      "validarte y configurar tu información personal"
    );

    flow.channel.setTopic("En este canal podrás configurar tu información personal y validar tu identidad.");

    const [User] = await UserModel.addFromDiscord(flow.user);

    await flow.channel.send(sendMainMessage(User, false));
  }
);
