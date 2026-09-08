import type { Avatars } from "../types";
export const defaultAvatars: Avatars = {
  user1: "https://i.pravatar.cc/96?img=12",
  user2: "https://i.pravatar.cc/96?img=47",
};
export function avatarUrl(user: string, avatars: Avatars) {
  return avatars[user] || defaultAvatars[user] || "";
}
export function validAvatarUrl(value: string) {
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
