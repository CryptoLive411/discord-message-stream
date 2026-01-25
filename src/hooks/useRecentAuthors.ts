import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentAuthor {
  name: string;
  count: number;
}

export function useRecentAuthors() {
  return useQuery({
    queryKey: ['recentAuthors'],
    queryFn: async (): Promise<RecentAuthor[]> => {
      // Get distinct author names from recent messages
      const { data, error } = await supabase
        .from('message_queue')
        .select('author_name')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Count occurrences
      const counts = new Map<string, number>();
      for (const row of data || []) {
        const name = row.author_name;
        if (name && name !== 'Unknown') {
          counts.set(name, (counts.get(name) || 0) + 1);
        }
      }

      // Convert to array and sort by count
      return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
