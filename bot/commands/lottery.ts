import { RoleFilter } from "../../discord/filters";
import { CommandTrigger } from "../../discord/triggers";

new CommandTrigger(
  {
    name: "lottery",
    alias: ["sorteo", "sortear"],
    parameters: "<valor minimo?> <valor maximo>",
    description: "Devuelve un valor entre el máximo y el mínimo especificado",
    filters: [
      new RoleFilter({roles: "TMSA", adminBypass: true})
    ]
  },
  async (message, {parameters}) => {
    let min = Number(parameters[0]);
    let max = Number(parameters[1])

    if (!max || isNaN(max)) {
      max = min;
      min = 0;
    }

    if (!max || isNaN(max)) {
      return await message.reply("Debes especificar al menos un valor númerico valido para usar como máximo.")
    }

    const random = Math.floor(Math.random() * (max - min + 1) + min)
    
    return await message.reply(`El número sorteado es: **${random}**`)
  }
);
