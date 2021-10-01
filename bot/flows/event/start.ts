import { Message, MessageEmbed } from "discord.js";
import {
  EventDocument,
  EventModel,
  UserDocument,
  UserModel,
} from "temporary-database";
import { component } from "../../../discord/methods/component";
import { newFlow } from "../../../discord/methods/flow";
import { getFullWidth } from "../../../discord/methods/fullWidth";
import { Logger } from "../../../discord/methods/logger";
import { ButtonTrigger } from "../../../discord/triggers";
import { canContinue } from "./continueHere";
import { setEmailButtons } from "./email";
import { finishButton } from "./finish";

export const getEventFromEmbed = async (message: Message) => {
  const eventName = message.embeds.at(0)?.footer?.text;
  if (!eventName) {
    Logger.warn("No se encontró el nombre del evento en el embed.");
    return;
  }

  const event = await EventModel.findOne({ name: eventName });
  if (!event) {
    Logger.warn("No se encontró el evento en la base de datos.");
    return;
  }

  return event;
};

export const sendEventMessage = async (
  event: EventDocument,
  user: UserDocument,
  disabled?: boolean,
  sendFiles = true
) => {
  const { file, image } = getFullWidth();

  const meta = JSON.parse(event.meta ?? "{}");

  const completeName =
    typeof meta.completeName === "string" ? meta.completeName : event.name;
  const eventFullName =
    typeof meta.link === "string"
      ? `[**${completeName}**](${meta.link})`
      : completeName;

  const loc = meta.locations;
  const locations = Array.isArray(loc)
    ? (loc
        .map(({ name, link }: any) => {
          if (typeof name !== "string") return;

          return typeof link === "string" ? `[**${name}**](${link})` : name;
        })
        .filter((value) => value !== undefined) as string[])
    : [];

  let email = null;
  let resolved = false;

  const invite = await user.getInvite(event, false);
  if (invite) {
    email = invite.email;
    resolved = true;
  } else {
    email = await user.getInvite(event, true);
  }

  const embed = new MessageEmbed()
    .setImage(image)
    .setTitle("Ingreso al evento")
    .setFooter(event.name);

  if (email) {
    embed.addField("E-mail", `> **${email}**`).addField(
      "Estado",
      resolved
        ? "Ya tenés acceso al evento!"
        : `
Al parecer este e-mail no figura en nuestra base de datos.
      
Esto puede deberse a varios motivos:
 - Que el e-mail especificado no coincida con el que usaste al inscribirte.
 - Que aún no te hayas inscripto al ${eventFullName}.
${
  locations.length > 0
    ? `Que te hayas inscripto a una localidad que no sea ${locations.join(
        ", "
      )}.\n`
    : ""
} - Que la base de datos aún no se haya actualizado y aún no tengamos tu e-mail.
        `.trim()
    );
  } else {
    embed.addField(
      "E-mail",
      `
Para acceder al evento deberás configurar tu e-mail.

El e-mail deberá coincidir con el que usaste para inscribirte al ${eventFullName}

${
  locations.length > 0
    ? `Tené en cuenta que en TMSA solo organizamos los eventos de las siguientes localidades:
 - ${locations.join("\n - ")}
 
Si la localidad a la que te inscribiste no es una de estas, te sugerimos que te pongas en contacto con el organizador de tu sede.`
    : ""
}`.trim()
    );
  }

  return {
    embeds: [embed],
    components: component(
      ...setEmailButtons(!!email, disabled),
      finishButton(!!email, disabled)
    ),
    files: sendFiles ? [file] : undefined,
  };
};

new ButtonTrigger(
  {
    id: "accessEvent",
    dontUpdate: true,
  },
  async (channel, user, interaction) => {
    const button = interaction.component;

    if (button?.type !== "BUTTON") return;

    const event = button.label
      ?.trim()
      .match(/^Acceder al (.+)$/)
      ?.at(1);

    if (!event)
      return Logger.warn(
        "No se encontró el nombre del evento en el boton de acceso."
      );

    const Event = await EventModel.findOne({ name: event });

    if (!Event)
      return Logger.warn(
        `No se encontró el evento ${event} en la base de datos`
      );

    const previousFlow = await canContinue(event, user);
    if (previousFlow) {
      await interaction.reply({
        content: `Podes ingresar al evento aquí: <#${previousFlow.channel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    const flow = await newFlow(
      user,
      `evento-${event}-${user.user.username}-${user.user.discriminator}`,
      `acceder a los canales destinados al ${event}.`
    );

    await interaction.reply({
      content: `Podes ingresar al evento aquí: <#${flow.channel.id}>.`,
      ephemeral: true,
    });

    flow.channel.setTopic(
      "En este canal podrás configurar tu información personal y validar tu identidad."
    );

    const [User] = await UserModel.addFromDiscord(flow.user);

    await flow.channel.send(await sendEventMessage(Event, User, false));
  }
);
