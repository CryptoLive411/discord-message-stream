import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserX, Plus, X, AlertTriangle } from 'lucide-react';
import { useBannedAuthors } from '@/hooks/useBannedAuthors';

export function BannedAuthorsSection() {
  const [newUsername, setNewUsername] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const { authors, isLoading, addAuthor, removeAuthor } = useBannedAuthors();

  const handleAdd = () => {
    if (newUsername.trim()) {
      addAuthor.mutate({ username: newUsername, notes: newNotes });
      setNewUsername('');
      setNewNotes('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newUsername.trim()) {
      handleAdd();
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10">
          <UserX className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Banned Authors</h2>
          <p className="text-sm text-muted-foreground">Users who will never be relayed</p>
        </div>
      </div>

      <Separator />

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Messages from these users will <strong>always be skipped</strong>, even if no whitelist is set. 
          Blacklist takes priority over the tracked authors whitelist.
        </p>
      </div>

      {/* Add new author */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Discord display name (e.g., Rick)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-mono"
            />
          </div>
          <Button 
            onClick={handleAdd} 
            disabled={!newUsername.trim() || addAuthor.isPending}
            variant="destructive"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ban
          </Button>
        </div>
        <Input
          placeholder="Optional notes (e.g., reposts content from other users)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm"
        />
      </div>

      {/* Current banned authors */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Currently banned ({authors.length})
        </Label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : authors.length === 0 ? (
            <span className="text-sm text-muted-foreground italic">
              No banned authors — all users can be relayed
            </span>
          ) : (
            authors.map((author) => (
              <Badge
                key={author.id}
                variant="destructive"
                className="flex items-center gap-1 pr-1 font-mono"
                title={author.notes || undefined}
              >
                {author.username}
                <button
                  onClick={() => removeAuthor.mutate(author.id)}
                  className="ml-1 hover:bg-destructive-foreground/20 rounded p-0.5"
                  disabled={removeAuthor.isPending}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
