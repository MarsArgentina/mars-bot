import { EventModel, GroupModel, UserModel } from "temporary-database";
import { ChannelFilter } from "../../discord/filters";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { getAdminRole, isAdmin } from "../../discord/methods/getServerRoles";
import { getPrefix } from "../../discord/methods/parseCommand";
import { CommandTrigger } from "../../discord/triggers";
import { sendControlPanel } from "../flows/group/controlPanel";
import { getGroupListChannel } from "../flows/group/list";

new CommandTrigger(
  {
    name: "group",
    description: "Crea un nuevo grupo en este evento",
    alias: ["grupo"],
    filters: [
      new ChannelFilter({
        channel: "comandos-evento",
        adminBypass: false,
        error:
          "Este comando solo puede ser usado en el canal de comandos-evento de algún evento activo.",
      }),
    ],
  },
  async (message, { parameters }) => {
    const member = getMemberFromMessage(message);
    if (!member) return;

    const guild = member.guild;

    const name = parameters.join(" ").trim();
    if (!name || name === "") {
      return await message.reply(
        `Debes especificar un nombre para tu grupo.\n\`${getPrefix(
          message
        )}grupo nombre del grupo\``
      );
    }

    if (message.channel.type !== "GUILD_TEXT" || !message.guild) return;

    const eventCategory = message.channel.parent;
    const adminRole = getAdminRole(message.guild);
    const admin = adminRole ? `<@${adminRole.id}>` : "Administrador";

    if (!eventCategory)
      return message.reply(
        `No pude encontrar el evento en el cual debería crear el grupo. Voy a tener que buscarlo mejor con ayuda de un ${admin}.`
      );

    const user = await UserModel.findFromDiscord(message.author.id);
    if (!user)
      return await message.reply(
        `No puedo encontrarte en la base de datos, este problema debería de solucionarse en unos minutos, si persiste ponete en contacto con algun ${admin}.`
      );

    const event = await EventModel.findOne({ category: eventCategory.id });

    if (!event) {
      return await message.reply(
        "No pude encontrar el evento vinculado a esta category de Discord. Puede que algo ande mal con mi base de datos."
      );
    }
    if (event.maxGroupSize < 1) {
      return await message.reply("Este evento no admite grupos");
    }

    const invite = await user.getInvite(event, false);
    if (!invite && !isAdmin(member)) {
      return await message.reply(
        "Al parecer no tenés una invitación al evento, por lo cual no podes formar parte de un grupo."
      );
    }

    if (invite && invite.group && !isAdmin(member)) {
      const group = await GroupModel.fetchGroup(invite.group);
      return await message.reply(
        `Al parecer ya formas parte ${
          group ? `del grupo "${group.name}"` : "de un grupo"
        }, deberás abandonar tu grupo actual para unirte a uno nuevo.`
      );
    }

    const meta = JSON.parse(event.meta);

    const groupCategory =
      typeof meta.groupCategory === "string"
        ? await guild.channels
            .fetch(meta.groupCategory as string)
            .catch(() => null)
        : null;
    if (groupCategory?.type !== "GUILD_CATEGORY")
      return await message.reply("Este evento no admite grupos.");

    const textChannel = await (
      await guild.channels.create(name, {
        parent: groupCategory,
      })
    ).lockPermissions();

    const voiceChannel = await (
      await guild.channels.create(name, {
        type: "GUILD_VOICE",
        parent: groupCategory,
      })
    ).lockPermissions();

    const role = await guild.roles.create({ name, mentionable: true });

    textChannel.permissionOverwrites.edit(role, {
      ADD_REACTIONS: true,
      STREAM: true,
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      SEND_TTS_MESSAGES: true,
      EMBED_LINKS: true,
      ATTACH_FILES: true,
      READ_MESSAGE_HISTORY: true,
      CONNECT: true,
      SPEAK: true,
      USE_VAD: true,
      USE_APPLICATION_COMMANDS: true,
      REQUEST_TO_SPEAK: true,
      USE_PUBLIC_THREADS: true,
      USE_PRIVATE_THREADS: true,
    });

    const group = await event.addGroup(name, role.id, textChannel.id, [
      voiceChannel.id,
    ]);

    if (invite) {
      group.addInvite(invite);
      invite.group = group;

      await invite.save();
      await member.roles.add(role);
    }

    await group.save();

    const embed = await textChannel.send(sendControlPanel(group, event));

    await textChannel.send(
      `<@${member.id}> tu grupo "${name}" ha sido creado. Ya podes utilizar esta sala y <#${voiceChannel.id}> para hablar con los integrantes del grupo.`
    );

    await embed.pin();

    const listGroupChannel = await getGroupListChannel(event, member.guild);

    if (listGroupChannel) {
      const prefix = getPrefix(message);

      await textChannel.send(
        `
Esta es la sala principal de tu grupo.

Por ahora solo somos vos y yo, pero podes sumar más gente diciendoles que utilizen el comando \`${prefix}unirse ||${group.accessCode}||\` en el canal <#${message.channel.id}>

Y si todavía no tenés un grupo de 6 personas y te interesa sumar a alguien más, te sugiero cambiar la visibilidad haciendo click en "Abrir Grupo" esto hará que tu grupo se muestre en el canal <#${listGroupChannel.id}>

Espero que este mensaje te haya sido de ayuda, éxitos con tu proyecto.`.trim()
      );
    }
  }
);
