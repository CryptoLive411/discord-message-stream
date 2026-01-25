import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BannedAuthor {
  id: string;
  username: string;
  notes: string | null;
  created_at: string;
}

export function useBannedAuthors() {
  const queryClient = useQueryClient();

  const { data: authors = [], isLoading, error } = useQuery({
    queryKey: ['banned-authors'],
    queryFn: async (): Promise<BannedAuthor[]> => {
      const { data, error } = await supabase
        .from('banned_authors')
        .select('*')
        .order('username');
      
      if (error) throw error;
      return data || [];
    },
  });

  const addAuthor = useMutation({
    mutationFn: async ({ username, notes }: { username: string; notes?: string }) => {
      const { error } = await supabase
        .from('banned_authors')
        .insert({ username: username.trim(), notes: notes?.trim() || null });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-authors'] });
      toast.success('Author added to blacklist');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('This username is already in the blacklist');
      } else {
        toast.error(`Failed to add author: ${error.message}`);
      }
    },
  });

  const removeAuthor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('banned_authors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-authors'] });
      toast.success('Author removed from blacklist');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove author: ${error.message}`);
    },
  });

  const updateAuthor = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string | null }) => {
      const { error } = await supabase
        .from('banned_authors')
        .update({ notes })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banned-authors'] });
      toast.success('Author updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update author: ${error.message}`);
    },
  });

  return {
    authors,
    isLoading,
    error,
    addAuthor,
    removeAuthor,
    updateAuthor,
  };
}
