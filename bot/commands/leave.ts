import { Ref } from "@typegoose/typegoose";
import { GroupDocument, GroupModel, Event, EventModel, helpers } from "temporary-database";
import { GroupChannelFilter } from "../../discord/filters";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { CommandTrigger } from "../../discord/triggers";
import { leaveGroup } from "../flows/group/leave";

new CommandTrigger(
  {
    name: "leave",
    alias: ["abandonar"],
    description: "Abandona el grupo en el que te encuentras actualmente",
    filters: [
      new GroupChannelFilter({
        canBeUsedInCommands: true,
        error: "Este comando solo puede ser usado en un grupo o en comandos-evento."
      })
    ]
  },
  async (message) => {
    const member = getMemberFromMessage(message);
    if (!member) return;

    const channel = message.channel;
    if (channel.type !== "GUILD_TEXT") return;

    let event: Ref<Event>|string;
    let group: GroupDocument|undefined;

    if (channel.name === "comandos-evento") {
      const eventCategory = channel.parent;
      if (!eventCategory) {
        return await message.reply("Parece que hay un error con la configuración de canales, no pude encontrar el evento.")
      } 
  
      event = await EventModel.findOne({ category: eventCategory.id }) ?? undefined;
    } else {
      group = await GroupModel.findOne({mainChannel: channel.id}) ?? undefined;

      if (!group) {
        return await message.reply(
          "No puedo encontrar el grupo que estás intentando abandonar, probá usar el comando en el canal de tu grupo o en #comandos-evento de algún evento"
        )
      }

      event = group.event;
    }

    if (!event) {
      return await message.reply(
        "No pude encontrar el evento vinculado a esta categoria de Discord. Puede que algo ande mal con mi base de datos."
      );
    }

    try {
      const promises = await leaveGroup(member, event, group);

      await Promise.all(promises);

      if (channel.name === "comandos-evento") {
        return await message.reply("Has abandonado tu grupo con exito.");
      } else {
        return await message.delete();
      }
    } catch (e) {
      const error = helpers.guaranteeError(e);

      return await message.reply(error.message)
    }
  }
);
