import { Client, GuildMember, Message } from "discord.js";
import { Filter, FilterType, FILTER_TYPES, Channels } from "../filters/base";

export class BaseTrigger {
  #filters: Filter[];

  constructor(allowedFilters: FilterType, filters?: Filter[]) {
    this.#filters = filters ?? [];

    const accepts = FILTER_TYPES.slice(0, FILTER_TYPES.indexOf(allowedFilters) + 1);

    for (const filter of this.#filters) {
      if (!accepts.includes(filter.type))
        throw new Error(
          `This Trigger doesn't allow ${
            filter.constructor.name
          }s, since it's a ${
            filter.type
          } filter and this trigger accepts: [${accepts.join(", ")}].`
        );
    }
  }

  set filters(filters: Filter[] | undefined) {
    this.#filters.splice(0, this.#filters.length);
    filters?.forEach((f) => this.#filters.push(f));
  }

  get filters() {
    return [...this.#filters];
  }

  async canExecute(user: GuildMember, channel: Channels, message?: Message): Promise<[boolean, string|undefined]> {
    // Filters are processed in order
    for (const filter of this.#filters) {
      const pass = await filter.filter(user, channel, message);
      if (!pass) return [false, filter.errorMessage];
    }

    // If no filter returned false, then this trigger can execute
    return [true, undefined];
  }
}
export interface TriggerConstructor {
  registerTrigger: (bot: Client) => void;
}