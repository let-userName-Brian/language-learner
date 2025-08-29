


import { supabase } from '@/services/supabase-init';
import { StateCreator } from 'zustand';
import { AppStore, AuthActions, AuthState } from '../store';

export const createAuthSlice: StateCreator<
  AppStore,
  [],
  [],
  AuthState & { auth: AuthActions }
> = (set, get) => ({
  // State
  user: null,
  session: null,
  userProfile: null,
  authLoading: false,
  authError: null,
  lastFetch: null,

  // Actions
  auth: {
    loadUser: async () => {
      set({ authLoading: true, authError: null });
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        
        if (!user) {
          set({ user: null, session: null, userProfile: null, authLoading: false });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select(`
            user_id, first_name, display_name, role, school_id, grade_level, student_id,
            schools!inner(name)
          `)
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        const userProfile = {
          ...profile,
          grade: profile.grade_level,
          student_id: profile.student_id,
          school_name: (profile.schools as any)?.name || undefined
        };

        set({ 
          user, 
          session: sessionData.session, 
          userProfile,
          authLoading: false,
          lastFetch: Date.now()
        });
      } catch (error: any) {
        set({ 
          authError: error.message || 'Failed to load user', 
          authLoading: false 
        });
      }
    },

    signOut: async () => {
      await supabase.auth.signOut();
      get().auth.clearUser();
    },

    clearUser: () => {
      set({ 
        user: null, 
        session: null, 
        userProfile: null, 
        authError: null 
      });
    },

    setUserFromSignin: async (user: any, session: any, schoolData: { slug: string; id: string; name?: string }) => {
      set({ authLoading: true, authError: null });
      
      try {
        // Get full user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, display_name, role, school_id')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        const userProfile = {
          ...profile,
          school_slug: schoolData.slug,
          school_name: schoolData.name || undefined
        };

        set({ 
          user, 
          session, 
          userProfile,
          authLoading: false,
          lastFetch: Date.now()
        });
      } catch (error: any) {
        set({ 
          authError: error.message || 'Failed to set user data', 
          authLoading: false 
        });
      }
    }
  }
});