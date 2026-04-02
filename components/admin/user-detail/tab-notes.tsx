"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Pencil, Loader2 } from "lucide-react";
import { createAdminNote, updateAdminNote, deleteAdminNote } from "@/app/actions/admin/notes";

interface Note {
  id: string;
  adminId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TabNotesProps {
  notes: Note[];
  userId: string;
  currentAdminId: string;
}

export function TabNotes({ notes: initialNotes, userId, currentAdminId }: TabNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newContent.trim()) return;
    startTransition(async () => {
      const result = await createAdminNote(userId, newContent);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.success && result.note) {
        setNotes([result.note, ...notes]);
        setNewContent("");
        toast.success("Note added");
      }
    });
  }

  function handleUpdate(noteId: string) {
    if (!editContent.trim()) return;
    startTransition(async () => {
      const result = await updateAdminNote(noteId, editContent);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else if (result.success && result.note) {
        setNotes(notes.map((n) => (n.id === noteId ? result.note! : n)));
        setEditingId(null);
        toast.success("Note updated");
      }
    });
  }

  function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;
    startTransition(async () => {
      const result = await deleteAdminNote(noteId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setNotes(notes.filter((n) => n.id !== noteId));
        toast.success("Note deleted");
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Add an internal note about this user..."
            rows={3}
          />
          <Button size="sm" onClick={handleCreate} disabled={isPending || !newContent.trim()}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
            Add Note
          </Button>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No notes yet</p>
          </CardContent>
        </Card>
      ) : (
        notes.map((note) => (
          <Card key={note.id}>
            <CardContent className="pt-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(note.id)} disabled={isPending}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.createdAt).toLocaleString()}
                      {note.updatedAt > note.createdAt && " (edited)"}
                    </p>
                    {note.adminId === currentAdminId && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(note.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
