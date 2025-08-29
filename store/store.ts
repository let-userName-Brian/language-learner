
import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createLessonsSlice } from './slices/lessonsSlice';


export interface RefreshableState {
  refreshing: boolean;
}

export interface AuthState {
  user: any | null;
  session: any | null;
  userProfile: {
    user_id: string;
    student_id?: string;
    first_name?: string;
    display_name?: string;
    role: 'student' | 'teacher' | 'parent';
    school_id?: string;
    grade?: string;
    school_name?: string;
    school_slug?: string; 
  } | null;
  authLoading: boolean;
  authError: string | null;
  lastFetch: number | null;
}

export interface AuthActions {
  loadUser: () => Promise<void>;
  setUserFromSignin: (user: any, session: any, schoolData: { slug: string; id: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  clearUser: () => void;
}

// Store slice for lessons data
export interface LessonsState {
  lessonsData: any[];
  currentLesson: any | null;
  items: { [lessonId: string]: any[] };
  itemCounts: { [lessonId: string]: { [kind: string]: number } };
  progress: { [lessonId: string]: any };
  lessonsLoading: boolean;
  refreshing: boolean;
  lessonsError: string | null;
  lastFetch: number | null;
}

export interface LessonsActions {
  loadLessons: (userId?: string) => Promise<void>;
  loadLessonItems: (lessonId: string) => Promise<any[]>;
  loadProgress: (userId?: string) => Promise<void>;
  updateProgress: (lessonId: string, progressData: any) => Promise<void>;
  completeSection: (lessonId: string, sectionType: string) => Promise<{allSectionsComplete: boolean, sectionType: string, lessonId: string}>;
  refreshLessons: () => Promise<void>;
  clearLessons: () => void;
  loadDashboardData: (isRefresh?: boolean) => Promise<void>;
}

// Combined store type
export interface AppStore extends AuthState, LessonsState {
  auth: AuthActions;
  lessons: LessonsActions;
}

export const useAppStore = create<AppStore>()(
  // Temporarily remove devtools
  (...args) => ({
    ...createAuthSlice(...args),
    ...createLessonsSlice(...args),
  })
);

// Fix useAuth hook
export const useAuth = () => ({
  user: useAppStore(state => state.user),
  session: useAppStore(state => state.session),
  userProfile: useAppStore(state => state.userProfile),
  loading: useAppStore(state => state.authLoading),
  error: useAppStore(state => state.authError),
  actions: useAppStore(state => state.auth)
});

// Fix useLessons hook
export const useLessons = () => ({
  lessons: useAppStore(state => state.lessonsData),
  currentLesson: useAppStore(state => state.currentLesson),
  items: useAppStore(state => state.items),
  itemCounts: useAppStore(state => state.itemCounts),
  progress: useAppStore(state => state.progress),
  loading: useAppStore(state => state.lessonsLoading),
  refreshing: useAppStore(state => state.refreshing),
  error: useAppStore(state => state.lessonsError),
  actions: useAppStore(state => state.lessons)
});