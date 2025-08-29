import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

type CourseAssignment = {
  grade_level: string;
  course_ids: string[];
  student_user_ids: string[];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, serviceRoleKey);

    // Auth: teacher must be signed in
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const teacher = await supa.auth.getUser(jwt);
    const teacherId = teacher.data.user?.id;
    if (!teacherId) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { 
      school_id, 
      academic_year_id, 
      course_assignments 
    } = body as {
      school_id: string;
      academic_year_id: string;
      course_assignments: CourseAssignment[];
    };

    // Verify teacher belongs to this school
    const { data: teacherProfile } = await supa
      .from("user_profiles")
      .select("school_id")
      .eq("user_id", teacherId)
      .eq("role", "teacher")
      .single();
    
    if (!teacherProfile || teacherProfile.school_id !== school_id) {
      return new Response("Unauthorized for this school", { status: 403 });
    }

    // Process course assignments
    const enrollments = [];
    for (const assignment of course_assignments) {
      for (const courseId of assignment.course_ids) {
        for (const studentUserId of assignment.student_user_ids) {
          enrollments.push({
            student_user_id: studentUserId,
            teacher_user_id: teacherId,
            course_id: courseId,
            academic_year_id,
            school_id,
          });
        }
      }
    }

    // Batch insert enrollments (upsert to handle duplicates)
    const { error } = await supa
      .from("student_course_enrollments")
      .upsert(enrollments);

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      enrollments_created: enrollments.length,
      assignments_processed: course_assignments.length 
    }), {
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(e) 
    }), {
      status: 500,
      headers: { 
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
    });
  }
});
