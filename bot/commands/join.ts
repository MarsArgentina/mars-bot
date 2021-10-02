import { CommandTrigger } from "../../discord/triggers";
import { GroupModel, EventModel, helpers } from "temporary-database";
import { getMemberFromMessage } from "../../discord/methods/getMember";
import { joinGroup } from "../flows/group/acceptRequest";
import { getPrefix } from "../../discord/methods/parseCommand";

new CommandTrigger(
  {
    name: "join",
    parameters: "||código||",
    alias: ["unirse"],
    description: "Unite a un grupo usando un codigo de acceso",
  },
  async (message, { parameters, name }) => {
    const member = getMemberFromMessage(message);
    if (!member) return;
    
    const channel = message.channel;    
    await message.delete();

    try {
      const code = message.cleanContent
        .replaceAll(`${getPrefix(message)}${name}`, "")
        .replaceAll("|", "")
        .trim();

      if (!code || code === "") {
        return await channel.send(`<@${member.id}> No especificaste un código de grupo.`);
      }

      const group = await GroupModel.findOne({ accessCode: code });
      if (!group) {
        return channel.send(`<@${member.id}> No encontré el grupo al que intentaste unirte.`);
      }

      const event = await EventModel.fetchEvent(group.event);
      if (!event) {
        return await channel.send(
          `<@${member.id}> No encontré el evento al que pertenece este grupo.`
        );
      }

      const promises = await joinGroup(event, group, member);

      await Promise.all(promises);
    } catch (e) {
      return await channel.send(`<@${member.id}> ${helpers.guaranteeError(e).message}`)
    }
  }
);
