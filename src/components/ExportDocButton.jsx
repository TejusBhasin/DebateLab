import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportToGoogleDocs, downloadAsDoc } from "@/lib/exportDoc";

// getMarkdown can be a string or a function returning one.
export default function ExportDocButton({ title, getMarkdown, size = "sm", label = "Google Docs", showDownload = true }) {
  const { toast } = useToast();
  const md = () => (typeof getMarkdown === "function" ? getMarkdown() : getMarkdown);

  const run = async (e) => {
    e.stopPropagation();
    await exportToGoogleDocs(title, md());
    toast({ title: "Copied! Paste into the new Google Doc", description: "A blank doc opened in a new tab. Press Ctrl/Cmd+V to paste with formatting." });
  };

  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size={size} onClick={run} className="gap-1.5 text-xs h-8">
        <FileDown className="w-3 h-3" /> {label}
      </Button>
      {showDownload && (
        <Button variant="outline" size={size} onClick={() => downloadAsDoc(title, md())} className="text-xs h-8" title="Download as .doc (opens in Google Docs/Word)">
          .doc
        </Button>
      )}
    </span>
  );
}