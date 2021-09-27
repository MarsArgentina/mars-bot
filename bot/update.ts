import { Guild, GuildMember } from "discord.js";
import { UserDocument, UserModel } from "temporary-database";
import { setImmediate, setTimeout } from "timers/promises";
import { getFlowCategory } from "../discord/methods/flow";
import { getValidatedRole } from "../discord/methods/getServerRoles";

const UPDATE_DELAY = 10000;
const FLOW_DELETE_TIMEOUT = 600000;

export const update = async (guild: Guild, signal?: AbortSignal) => {
  while (!signal?.aborted) {
    try {
      await updateStep(guild);

      await setTimeout(UPDATE_DELAY, undefined, {
        signal,
      });
    } catch (e) {}
  }
};

export const updateUser = async (user: GuildMember, entry: UserDocument) => {
  const userRoles = await entry.getAllRoles();

  const validated = getValidatedRole(user.guild)

  if ((await entry.isValidated()) && validated) userRoles.push(validated.id);

  const roles = user.guild.roles.cache.filter((role) =>
    userRoles.includes(role.id)
  );

  entry.inDiscord = true;
  entry.isUpdating = false;

  await Promise.allSettled([
    entry.save(),
    user.roles
      .set(roles)
      .then((user) => user.setNickname(entry.displayName ?? entry.name)),
  ]);
};

const flowCleanup = async (guild: Guild) => {
  const flows = getFlowCategory(guild);
  if (!flows) return;

  await Promise.allSettled(
    flows.children.map(async (flow) => {
      if (flow.isText()) {
        const timestamp =
          flow.lastMessage?.editedTimestamp ??
          flow.lastMessage?.createdTimestamp ??
          flow.createdTimestamp;

        if (Date.now() - timestamp > FLOW_DELETE_TIMEOUT) {
          await flow.delete();
        }
      }
    })
  );

  return;
};

const updateStep = async (guild: Guild) => {
  await UserModel.startUpdate();

  for (const user of (await guild.members.fetch()).values()) {
    await setImmediate();
    const [entry] = await UserModel.addFromDiscord(user);
    await updateUser(user, entry);
  }

  await UserModel.finishUpdate();

  await flowCleanup(guild);
};
