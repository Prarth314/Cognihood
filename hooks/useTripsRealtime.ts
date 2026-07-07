
import { useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

/** Re-fetch trips when a new row is inserted for the current user. */
export function useTripsRealtime(userId: string | undefined, onChange: () => void): void {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return;

    const channel = getSupabase()
      .channel(`trips:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips', filter: `user_id=eq.${userId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      getSupabase().removeChannel(channel);
    };
  }, [userId, onChange]);
}
