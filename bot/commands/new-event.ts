import fetch from "node-fetch";
import path from "path";
import { guaranteeError } from "temporary-database/dist/helpers";
import { AdminFilter } from "../../discord/filters";
import { ButtonTrigger, CommandTrigger } from "../../discord/triggers";
import { FromSchema } from "json-schema-to-ts";
import { validate, JSONSchema7 } from "json-schema";
import { getUserGuild } from "../../discord/methods/getUserGuild";
import {
  CategoryChannel,
  MessageButton,
  PermissionResolvable,
  Permissions,
  TextChannel,
} from "discord.js";
import { EventModel } from "temporary-database";
import { component } from "../../discord/methods/component";
import { getInteractionMessage } from "../../discord/methods/getInteractionMessage";
import { getAnnouncementsChannel } from "../../discord/methods/getChannels";

const EventSchema = {
  id: "/EventSchema",
  type: "object",
  properties: {
    name: { type: "string" },
    completeName: {type: "string"},
    link: {type: "string"},
    groupSize: { type: "number" },
    startMessage: { type: "string" },
    hidden: { type: "boolean" },
    locations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {type: "string"},
          link: {type: "string"}
        },
        required: ["name"]
      }
    },
    roles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          permissions: {
            enum: ["moderator", "participant", "observer", "outsider"],
          },
        },
        required: ["name", "role", "permissions"],
      },
    },
  },
  required: ["name", "startMessage", "roles"],
} as const;

type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };
const schema = EventSchema as DeepWriteable<typeof EventSchema> as JSONSchema7;

type EventData = FromSchema<typeof EventSchema>;

const generalPermissions: Record<
  EventData["roles"][number]["permissions"],
  { allow?: PermissionResolvable; deny?: PermissionResolvable }
> = {
  moderator: {
    allow: BigInt("6509035334"),
  },
  participant: {
    allow: BigInt("2184302144"),
  },
  observer: {
    allow: BigInt("2184564544"),
  },
  outsider: {
    deny: Permissions.ALL,
  },
};

const groupPermissions: Record<
  EventData["roles"][number]["permissions"],
  { allow?: PermissionResolvable; deny?: PermissionResolvable }
> = {
  ...generalPermissions,
  participant: generalPermissions.outsider,
};

const viewPermissions = {
  VIEW_CHANNEL: true,
  READ_MESSAGE_HISTORY: true,
  ADD_REACTIONS: true,
  USE_PUBLIC_THREADS: true,
};

const isValidEventData = (data: unknown): data is EventData => {
  return validate(data as {}, schema).valid;
};

new CommandTrigger(
  {
    name: "new-event",
    description:
      "Crea un evento nuevo con la información provista en un archivo JSON adjunto.",
    parameters: "[adjunto: evento.json]",
    filters: [new AdminFilter()],
  },
  async (message, { parameters }) => {
    const attachment = message.attachments.find((attachment) => {
      const ext = path.extname(attachment.name ?? "");

      if (ext === ".json") return true;

      return false;
    });

    if (!attachment) {
      return await message.reply(
        "Este comando necesita que adjuntes un archivo con extensión .json (archivo JSON) para importar la información"
      );
    }

    try {
      const file = await fetch(attachment.url);

      const data = await file.json();

      if (!isValidEventData(data)) {
        return await message.reply("La información provista no es valida.");
      }

      if (await EventModel.findOne({ name: data.name })) {
        return await message.reply("Ya existe un evento con este nombre.");
      }

      let meta = JSON.stringify({
        startMessage: data.startMessage,
        completeName: data.completeName,
        link: data.link,
        locations: data.locations
      });

      if (!data.hidden) {
        const guild =
          message.guild ?? getUserGuild(message.author, message.client);
        if (!guild)
          return await message.reply(
            "No se encontró el servidor en el que se realizará el evento."
          );

        const roles = data.roles.filter(({ role }) => role && role !== "");

        const everyone = {
          type: "role" as const,
          id: guild.roles.everyone.id,
          ...generalPermissions.outsider,
        };

        const mainCategory = await guild.channels.create(data.name, {
          type: "GUILD_CATEGORY",
          permissionOverwrites: [
            ...roles.map(({ role, permissions }) => ({
              type: "role" as const,
              id: role,
              ...generalPermissions[permissions],
            })),
            everyone,
          ],
        });

        const generalChannelPromise = guild.channels
          .create("general", {
            type: "GUILD_TEXT",
            parent: mainCategory,
          })
          .catch(() => null);
        const commandsChannelPromise = guild.channels
          .create("bot-comandos", {
            type: "GUILD_TEXT",
            parent: mainCategory,
          })
          .catch(() => null);

        const voiceChannelsPromise = Promise.all(
          new Array(3).fill(0).map(async (_, index) => {
            try {
              return await guild.channels.create(`sala-${index + 1}`, {
                type: "GUILD_VOICE",
                parent: mainCategory,
              });
            } catch (_) {
              return null;
            }
          })
        );

        let groupCategory: null | CategoryChannel = null;
        let groupListChannelPromise: Promise<TextChannel | null> =
          Promise.resolve(null);
        if (data.groupSize ?? 0 > 0) {
          groupCategory = await guild.channels.create(`Grupos ${data.name}`, {
            type: "GUILD_CATEGORY",
            permissionOverwrites: [
              ...roles.map(({ role, permissions }) => ({
                type: "role" as const,
                id: role,
                ...groupPermissions[permissions],
              })),
              everyone,
            ],
          });

          groupListChannelPromise = (async () => {
            try {
              const channel = await guild.channels.create(`grupos`, {
                type: "GUILD_TEXT",
                parent: groupCategory,
              });

              await channel.lockPermissions();

              await Promise.allSettled(
                roles
                  .filter(({ permissions }) => permissions === "participant")
                  .map(({ role }) => {
                    return channel.permissionOverwrites.edit(
                      role,
                      viewPermissions
                    );
                  })
              );

              return channel;
            } catch (e) {
              return null;
            }
          })();
        }

        const [
          generalChannel,
          commandsChannel,
          voiceChannels,
          groupListChannel,
        ] = await Promise.all([
          generalChannelPromise,
          commandsChannelPromise,
          voiceChannelsPromise,
          groupListChannelPromise,
        ]);

        meta = JSON.stringify({
          startMessage: data.startMessage,
          completeName: data.completeName,
          link: data.link,
          locations: data.locations,
          mainCategory: mainCategory.id,
          voiceChannels: voiceChannels
            .map((channel) => channel?.id)
            .filter((channel) => channel !== undefined) as string[],
          generalChannel: generalChannel?.id,
          commandsChannel: commandsChannel?.id,
          groupCategory: groupCategory?.id,
          groupListChannel: groupListChannel?.id,
        });
      }

      await EventModel.create({
        name: data.name,
        isHidden: data.hidden,
        maxGroupSize: data.groupSize ?? 0,
        roles: new Map(data.roles.map(({ name, role }) => [name, role])),
        meta,
      });

      return await message.reply({
        content: `Para enviar el mensaje de inicio, haz click en Comenzar.`,
        components: component(
          new MessageButton({
            customId: "startEvent",
            label: `Comenzar ${data.name}`,
            style: "PRIMARY",
          })
        ),
      });
    } catch (e) {
      return await message.reply(
        `Hubo un problema al descargar el archivo adjunto: ${
          guaranteeError(e).message
        }`
      );
    }
  }
);

new ButtonTrigger(
  {
    id: "startEvent",
  },
  async (channel, user, interaction) => {
    const button = interaction.component;
    if (button?.type !== "BUTTON") return;

    const event = button.label
      ?.trim()
      .match(/^Comenzar (.+)$/)
      ?.at(1);

    if (!event) return await channel.send("No se pudo encontrar el evento.");

    const document = await EventModel.findOne({ name: event });

    if (!document) return await channel.send("No se pudo encontrar el evento.");

    const meta = JSON.parse(document.meta ?? "{}");

    const startMessage = meta.startMessage;
    if (typeof startMessage === "string") {
      const guild =
        interaction.guild ?? getUserGuild(user.user, interaction.client);
      if (!guild) return;

      const announcements = getAnnouncementsChannel(guild);

      if (!announcements)
        return await channel.send(
          "No se encontró el canal de anuncios para enviar el mensaje."
        );

      return await announcements.send({
        content: startMessage,
        components: component(
          new MessageButton({
            customId: "accessEvent",
            label: `Acceder al ${event}`,
            style: "PRIMARY",
          })
        ),
      });
    } else {
      return await channel.send(
        "No se encontró el mensaje de inicio en el campo `meta` del evento: " +
          event
      );
    }
  }
);
