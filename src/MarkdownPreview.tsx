import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/common";
import clsx from "clsx";

type MarkdownPreviewProps = {
  content: string;
};

function makeHeadingId(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1(props) {
            const text = String(props.children);
            return <h1 id={makeHeadingId(text)}>{props.children}</h1>;
          },
          h2(props) {
            const text = String(props.children);
            return <h2 id={makeHeadingId(text)}>{props.children}</h2>;
          },
          h3(props) {
            const text = String(props.children);
            return <h3 id={makeHeadingId(text)}>{props.children}</h3>;
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
