import { useState } from "react";
import { useNotesAPI } from "@/hooks/useNotesAPI";
import { usePlugin } from "@/hooks/usePlugin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";

export default function CreateNoteView() {
  const notesAPI = useNotesAPI();
  const { loading, setLoading } = usePlugin();
  const { currentTheme } = useTheme();
  const [noteName, setNoteName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const handleCreate = async () => {
    const fileName = noteName.trim();
    if (!fileName) return;
    setError(null);
    setCreated(null);
    setLoading(true);
    try {
      await notesAPI.saveNote({ fileName, content: `# ${fileName}\n\n` });
      setCreated(fileName);
      setNoteName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Note</CardTitle>
          <CardDescription>Enter a name and create a new note.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-name">Note Name</Label>
              <Input
                id="note-name"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                placeholder="My New Note"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={!noteName.trim() || loading}>
                {loading ? "Creating..." : "Create Note"}
              </Button>
            </div>
            {created && <p className="text-sm" style={{ color: currentTheme.styles.semanticSuccess }}>Created "{created}"</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
