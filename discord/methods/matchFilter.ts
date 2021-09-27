import { Message } from "discord.js";

export type ResolvedMatchFilter =
  | ((value: string | Message) => boolean)
  | boolean;

export type MatchFilter =
  | ResolvedMatchFilter
  | (RegExp | string)
  | (RegExp | string)[]
  | undefined;

export const resolveMatchFilter = (match: MatchFilter): ResolvedMatchFilter => {
  if (typeof match === "string" || match instanceof RegExp) {
    match = [match];
  }

  if (typeof match === "function") {
    const m = match;
    return (value) => !!(value && m(value));
  }

  if (Array.isArray(match) && match.length > 0) {
    const m = match;

    return (value) => {
      const text = value instanceof Message ? value.cleanContent : value;

      return !!m.find((regexp) =>
        new RegExp(typeof regexp === "string" ? regexp.trim() : regexp).test(
          text.trim()
        )
      );
    };
  }

  return !!match ?? true;
};
