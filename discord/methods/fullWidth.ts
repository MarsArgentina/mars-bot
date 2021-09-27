import { MessageAttachment } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath, URL } from 'url';

const image = readFileSync(fileURLToPath(new URL("../../static/full_width.png", import.meta.url)))

export const getFullWidth = () => ({
  file: new MessageAttachment(image, "full_width.png"),
  image: 'attachment://full_width.png'
})