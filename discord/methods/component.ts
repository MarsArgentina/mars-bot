import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";

export type Interactables = MessageButton | MessageSelectMenu | undefined;

export const component = (
  ...components: (Interactables|Interactables[])[]
) => {
  if (components.length === 0) return;

  const rows: MessageActionRow[] = [new MessageActionRow()];

  components.forEach((component, index) => {
    if (!component) return;
    if (Array.isArray(component)) {
      if ((rows.at(-1)?.components.length ?? 2) < 1) rows.pop();

      rows.push(
        new MessageActionRow({
          components: component.filter((c) => c !== undefined) as Exclude<
            Interactables,
            undefined
          >[],
        })
      );

      rows.push(new MessageActionRow());
    } else {
      rows[rows.length - 1].addComponents(component);
    }
  });

  if ((rows.at(-1)?.components.length ?? 2) < 1) rows.pop();

  return rows;
};
