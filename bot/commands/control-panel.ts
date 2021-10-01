import { GroupChannelFilter } from "../../discord/filters";
import { CommandTrigger } from "../../discord/triggers";
import { getControlPanelMessage } from "../flows/group/controlPanel";

new CommandTrigger(
  {
    name: "control-panel",
    description: "Señala el panel de control de este grupo.",
    alias: ["panel-de-control", "controles"],
    filters: [
      new GroupChannelFilter({
        error: "Este comando solo esta disponible en un canal de grupo",
      }),
    ],
  },
  async (message) => {
    const channel = message.channel;
    if (channel.type !== "GUILD_TEXT") return;

    const controlPanel = await getControlPanelMessage(channel);
    if (!controlPanel) {
      return await message.reply(
        "No pude encontrar el panel de control, puede que alguien lo haya sacado de los pines. No te preocupes, debería de ser el primer mensaje de este canal."
      );
    }

    return await controlPanel.reply("Lo encontré! ☝");
  }
);
