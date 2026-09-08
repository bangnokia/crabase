import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download } from "lucide-react";
import { isArtifactUrl, isImageArtifact } from "../lib/artifacts";

export function MessageContent({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) =>
          href && isArtifactUrl(href) ? (
            <span className="artifact-link">
              {isImageArtifact(href) && typeof children === "string" && (
                <a href={href} target="_blank" rel="noreferrer">
                  <img src={href} alt={children} loading="lazy" />
                </a>
              )}
              <a href={`${href}?download=1`}>
                <Download size={14} />
                {children}
              </a>
            </span>
          ) : (
            <a href={href}>{children}</a>
          ),
      }}
    >
      {children}
    </Markdown>
  );
}
