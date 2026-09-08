import { useState } from "react";
import type { Avatars } from "../types";
import { avatarUrl } from "../lib/identity";
export function Avatar({
  user,
  avatars,
  size = "normal",
}: {
  user: string;
  avatars: Avatars;
  size?: "small" | "normal";
}) {
  const url = avatarUrl(user, avatars);
  const [failed, setFailed] = useState("");
  return (
    <span className={`avatar avatar-${size}`} title={user}>
      {url && failed !== url ? (
        <img src={url} alt={user} onError={() => setFailed(url)} />
      ) : (
        <span role="img" aria-label={user}>
          {user.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
export function AvatarStack({
  users = [],
  avatars,
}: {
  users?: string[];
  avatars: Avatars;
}) {
  if (!users.length) return null;
  return (
    <span className="avatar-stack" title={users.join(", ")}>
      {users.slice(0, 3).map((user) => (
        <Avatar key={user} user={user} avatars={avatars} size="small" />
      ))}
      {users.length > 3 && (
        <span
          className="avatar-overflow"
          aria-label={`${users.length - 3} more participants`}
        >
          +{users.length - 3}
        </span>
      )}
    </span>
  );
}
