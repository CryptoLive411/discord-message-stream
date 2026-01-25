import { useState } from 'react';
import { Users, Plus, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useTrackedAuthors } from '@/hooks/useTrackedAuthors';

export function TrackedAuthorsSection() {
  const [newUsername, setNewUsername] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const { authors, isLoading, addAuthor, removeAuthor } = useTrackedAuthors();

  const handleAdd = () => {
    if (!newUsername.trim()) return;
    addAuthor.mutate({ username: newUsername, notes: newNotes });
    setNewUsername('');
    setNewNotes('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Tracked Authors</h2>
          <p className="text-sm text-muted-foreground">Global whitelist of users to relay</p>
        </div>
      </div>

      <Separator />

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          When this list is empty, all messages are relayed. Add usernames to only relay messages from specific Discord users.
        </p>
      </div>

      {/* Add new author */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Discord username (e.g., CryptoKing)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="font-mono"
            />
          </div>
          <Button 
            onClick={handleAdd} 
            disabled={!newUsername.trim() || addAuthor.isPending}
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <Input
          placeholder="Notes (optional)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Current authors list */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
          Whitelisted Users ({authors.length})
        </Label>
        
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : authors.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">
            No users added — all messages will be relayed
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {authors.map((author) => (
              <Badge
                key={author.id}
                variant="secondary"
                className="pl-3 pr-1 py-1.5 flex items-center gap-2 group"
              >
                <span className="font-mono text-sm">{author.username}</span>
                {author.notes && (
                  <span className="text-xs text-muted-foreground">({author.notes})</span>
                )}
                <button
                  onClick={() => removeAuthor.mutate(author.id)}
                  className="p-0.5 rounded hover:bg-destructive/20 transition-colors"
                  disabled={removeAuthor.isPending}
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
