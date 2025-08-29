


import { supabase } from '@/services/supabase-init';
import { StateCreator } from 'zustand';
import { AppStore, LessonsActions, LessonsState } from '../store';

export const createLessonsSlice: StateCreator<
  AppStore,
  [],
  [],
  LessonsState & { lessons: LessonsActions }
> = (set, get) => ({
  // State
  lessonsData: [],
  currentLesson: null,
  items: {},
  itemCounts: {},
  progress: {},
  lessonsLoading: false,
  refreshing: false,
  lessonsError: null,
  lastFetch: null,

  // Actions
  lessons: {
    loadLessons: async (userId?: string) => {
      const targetUserId = userId || get().user?.id;
      if (!targetUserId) return;

      set({ lessonsLoading: true, lessonsError: null });

      try {
        // Get lessons only from courses the student is enrolled in
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select(`
            id, title, unit_id, order,
            units!inner(
              id, title, course_id,
              courses!inner(
                id, title,
                student_course_enrollments!inner(
                  student_user_id, is_active
                )
              )
            )
          `)
          .eq('units.courses.student_course_enrollments.student_user_id', targetUserId)
          .eq('units.courses.student_course_enrollments.is_active', true)
          .order('order');

        if (lessonsError) throw lessonsError;

        set({ 
          lessonsData: lessonsData || [],
          lessonsLoading: false,
          lastFetch: Date.now()
        });
      } catch (error: any) {
        set({ 
          lessonsError: error.message || 'Failed to load lessons',
          lessonsLoading: false 
        });
      }
    },

    loadProgress: async (userId?: string) => {
      const targetUserId = userId || get().user?.id;
      if (!targetUserId) return;

      try {
        const { data: progressData, error } = await supabase
          .from('progress')
          .select('lesson_id, status, updated_at, last_position')
          .eq('user_id', targetUserId);

        if (error) throw error;

        const progressMap = (progressData || []).reduce((acc, p) => {
          acc[p.lesson_id] = p;
          return acc;
        }, {} as { [key: string]: any });

        set({ progress: progressMap });
      } catch (error: any) {
        console.error('Failed to load progress:', error);
      }
    },

    loadLessonItems: async (lessonId: string) => {
      try {
        const { data: itemsData, error } = await supabase
          .from('items')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('id');

        if (error) {
          console.error(`Failed to load items for lesson ${lessonId}:`, error);
          throw error;
        }
        
        set((state) => ({
          items: {
            ...state.items,
            [lessonId]: itemsData || []
          }
        }));
        
        return itemsData || [];
      } catch (error: any) {
        console.error(`Failed to load items for lesson ${lessonId}:`, error);
        throw error;
      }
    },

    refreshLessons: async () => {
      set({ refreshing: true });
      await get().lessons.loadLessons();
      await get().lessons.loadProgress();
      set({ refreshing: false });
    },

    clearLessons: () => {
      set({
        lessonsData: [],
        currentLesson: null,
        items: {},
        itemCounts: {},
        progress: {},
        lessonsError: null
      });
    },

    updateProgress: async (lessonId: string, progressData: any) => {
      try {
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: progressData
          }
        }));
      } catch (error: any) {
        console.error('Failed to update progress:', error);
      }
    },
    
    completeSection: async (lessonId: string, sectionType: string) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) {
          throw new Error("Please sign in to save progress");
        }

        const state = get();
        
        // Get existing progress from store
        const existingProgress = state.progress[lessonId];
        const completedSections = existingProgress?.last_position?.completed_sections || [];
        const updatedSections = [...new Set([...completedSections, sectionType])];
        
        // Get lesson items to check if all sections are complete
        const lessonItems = state.items[lessonId];
        const uniqueSectionTypes = [...new Set(lessonItems?.map((item) => item.kind) || [])];
        const allSectionsComplete = uniqueSectionTypes.every((type) =>
          updatedSections.includes(type)
        );

        const payload = {
          user_id: user.user.id,
          lesson_id: lessonId,
          status: allSectionsComplete ? "completed" : "in_progress",
          last_position: {
            completed_sections: updatedSections,
            section_type: sectionType,
          },
          updated_at: new Date().toISOString(),
        };

        // Update database
        const { error } = await supabase
          .from("progress")
          .upsert(payload, { onConflict: "user_id,lesson_id" });

        if (error) throw error;

        // Update store - this will trigger all components to re-render
        set((state) => ({
          progress: { ...state.progress, [lessonId]: payload }
        }));

        return {
          allSectionsComplete,
          sectionType,
          lessonId
        };
      } catch (error: any) {
        console.error('Failed to complete section:', error);
        throw error;
      }
    },

    loadDashboardData: async (isRefresh = false) => {
      
      const targetUserId = get().user?.id;
      if (!targetUserId) {
        set({ lessonsError: "No user found" });
        return;
      }

      if (isRefresh) {
        set({ refreshing: true });
      } else {
        set({ lessonsLoading: true });
      }

      try {
        // Load all data in parallel
        await Promise.all([
          get().lessons.loadLessons(targetUserId),
          get().lessons.loadProgress(targetUserId)
        ]);

        // Get items data for progress calculations
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("id, lesson_id, kind, latin, accepted_english, lemmas, morph, media");

        if (itemsError) throw itemsError;

        // Calculate item counts by lesson and type
        const itemCounts: { [lessonId: string]: { [kind: string]: number } } = {};
        if (itemsData) {
          itemsData.forEach((item) => {
            if (!itemCounts[item.lesson_id]) {
              itemCounts[item.lesson_id] = {};
            }
            if (!itemCounts[item.lesson_id][item.kind]) {
              itemCounts[item.lesson_id][item.kind] = 0;
            }
            itemCounts[item.lesson_id][item.kind]++;
          });
        }

        // Store item counts in the state
        set({ itemCounts });

        // Calculate and set current lesson
        const lessonsData = get().lessonsData;
        const progressData = get().progress;

        if (lessonsData.length > 0 && itemsData) {
          // Find current lesson with proper progress calculation
          const currentLessonData = lessonsData.find((lesson) => {
            const progress = progressData[lesson.id];

            if (!progress) return true;

            // Check actual section completion
            const lessonItems = itemsData.filter(
              (item) => item.lesson_id === lesson.id
            );
            const uniqueSectionTypes = [
              ...new Set(lessonItems.map((item) => item.kind)),
            ];
            const completedSections = progress.last_position?.completed_sections || [];

            const allSectionsCompleted =
              uniqueSectionTypes.length > 0 &&
              uniqueSectionTypes.every((type) =>
                completedSections.includes(type)
              );

            return !allSectionsCompleted;
          });

          if (currentLessonData) {
            const progress = progressData[currentLessonData.id];
            const unitInfo = Array.isArray(currentLessonData.units)
              ? currentLessonData.units[0]
              : currentLessonData.units;

            let actualProgress = 0;
            if (progress?.last_position?.completed_sections) {
              const lessonItems = itemsData.filter(
                (item) => item.lesson_id === currentLessonData.id
              );
              const uniqueSectionTypes = [
                ...new Set(lessonItems.map((item) => item.kind)),
              ];
              const completedSections = progress.last_position.completed_sections;

              actualProgress = Math.round(
                (completedSections.length / uniqueSectionTypes.length) * 100
              );
            }

            const currentLesson = {
              id: currentLessonData.id,
              title: currentLessonData.title,
              unit_title: unitInfo?.title || "Unit",
              status: progress?.status || "not_started",
              progress: actualProgress,
            };

            set({ currentLesson });
          }
        }


        
      } catch (error: any) {
        set({ 
          lessonsError: error.message || 'Failed to load dashboard data'
        });
        console.error("Dashboard loading failed:", error);
      } finally {
        set({ 
          lessonsLoading: false, 
          refreshing: false 
        });
      }
    }
  }
});