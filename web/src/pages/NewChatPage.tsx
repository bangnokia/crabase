import type { ReactNode } from "react";
import { Crab } from "../components/Crab";
export function NewChatPage({
  hasProject,
  children,
}: {
  hasProject: boolean;
  children: ReactNode;
}) {
  return (
    <div className="home-page">
      <section className="welcome">
        <Crab size={36} />
        <h1>{hasProject ? "What should we build?" : "What’s on your mind?"}</h1>
        {children}
      </section>
    </div>
  );
}
