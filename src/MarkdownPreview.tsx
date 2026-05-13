import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/common";
import clsx from "clsx";
import type { ReactNode } from "react";
import { makeHeadingId, withUniqueHeadingIds } from "./lib/headings";

type MarkdownPreviewProps = {
  content: string;
};

function getNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => getNodeText(item)).join("");
  }

  if (value && typeof value === "object" && "props" in value) {
    return getNodeText((value as { props?: { children?: ReactNode } }).props?.children);
  }

  return "";
}

function parseCallout(children: ReactNode) {
  const text = getNodeText(children).trim();
  const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(text);
  if (!match) {
    return null;
  }

  const kind = match[1].toLowerCase();
  const title = match[1][0] + match[1].slice(1).toLowerCase();
  const body = match[2].trim();

  return {
    kind,
    title,
    body
  };
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const headingIds = withUniqueHeadingIds(
    content
      .split("\n")
      .map((line) => /^(#{1,3})\s+(.+)$/.exec(line))
      .filter((match): match is RegExpExecArray => Boolean(match))
      .map((match) => ({ id: makeHeadingId(getNodeText(match[2].trim().replace(/\s+#+\s*$/, ""))) }))
  ).map((heading) => heading.id);
  let headingIndex = 0;

  function getHeadingId(value: ReactNode) {
    const nextHeadingId = headingIds[headingIndex];
    headingIndex += 1;
    return nextHeadingId ?? makeHeadingId(getNodeText(value));
  }

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1(props) {
            return <h1 id={getHeadingId(props.children)}>{props.children}</h1>;
          },
          h2(props) {
            return <h2 id={getHeadingId(props.children)}>{props.children}</h2>;
          },
          h3(props) {
            return <h3 id={getHeadingId(props.children)}>{props.children}</h3>;
          },
          blockquote(props) {
            const callout = parseCallout(props.children);
            if (callout) {
              return (
                <aside className={clsx("md-callout", `md-callout-${callout.kind}`)}>
                  <div className="md-callout-title">{callout.title}</div>
                  {callout.body ? <p>{callout.body}</p> : null}
                </aside>
              );
            }

            return <blockquote>{props.children}</blockquote>;
          },
          img(props) {
            const alt = props.alt?.trim();
            return (
              <figure className="md-image">
                <img src={props.src} alt={alt || ""} title={props.title} />
                {alt ? <figcaption>{alt}</figcaption> : null}
              </figure>
            );
          },
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || "");
            const rawCode = String(children).replace(/\n$/, "");

            if (match) {
              const language = match[1];
              const highlighted = hljs.getLanguage(language)
                ? hljs.highlight(rawCode, { language }).value
                : hljs.highlightAuto(rawCode).value;

              return (
                <pre>
                  <code
                    className={clsx("hljs", className)}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                </pre>
              );
            }

            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
