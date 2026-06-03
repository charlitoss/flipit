import { useState } from "react";

interface Props {
  link: string;
  embed: string;
  onDownload: () => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button className={"btn-ghost" + (copied ? " copied" : "")} onClick={copy}>
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function ExportPopover({ link, embed, onDownload }: Props) {
  return (
    <div id="exportPop" className="popover">
      <h3>Export &amp; Share</h3>
      <div className="export-section">
        <div className="export-label">Shareable link</div>
        <div className="code-box">{link}</div>
        <CopyButton text={link} label="Copy link" />
      </div>
      <div className="export-section">
        <div className="export-label">Embed widget</div>
        <div className="code-box">{embed}</div>
        <CopyButton text={embed} label="Copy embed code" />
      </div>
      <div className="export-section">
        <div className="export-label">Image</div>
        <button className="btn-primary" onClick={onDownload}>
          Download PNG
        </button>
        <div className="hint">Captures the board exactly as shown, in the current palette.</div>
      </div>
    </div>
  );
}
