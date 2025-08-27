import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

type Row = {
  student_id: string;
  first_name: string;
  last_name: string;
  grade_level: string;
  parent_email: string;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supabaseUrl, serviceRoleKey);

    // Auth: teacher must be signed in on the client; we verify here
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const teacher = await supa.auth.getUser(jwt);
    const teacherId = teacher.data.user?.id;
    if (!teacherId) return new Response("Unauthorized", { status: 401 });

    // Parse payload
    const body = await req.json();
    const { school_slug, year_label, rows } = body as {
      school_slug: string; // e.g. "mountdesales"
      year_label: string; // e.g. "2025-2026"
      rows: Row[];
    };

    // Resolve school & year IDs and verify teacher belongs to the school
    const { data: schoolRow, error: sErr } = await supa
      .from("schools")
      .select("id")
      .eq("slug", school_slug)
      .single();
    if (sErr || !schoolRow) throw sErr ?? new Error("School not found");
    const school_id = schoolRow.id;

    const { data: yearRow, error: yErr } = await supa
      .from("academic_years")
      .select("id")
      .eq("label", year_label)
      .single();
    if (yErr || !yearRow) throw yErr ?? new Error("Year not found");
    const year_id = yearRow.id;

    // Verify teacher belongs to this school
    const { data: teacherProfile, error: teacherErr } = await supa
      .from("user_profiles")
      .select("school_id")
      .eq("user_id", teacherId)
      .eq("role", "teacher")
      .single();
    if (teacherErr || !teacherProfile) 
      return new Response("Teacher profile not found", { status: 403 });
    if (teacherProfile.school_id !== school_id)
      return new Response("Teacher does not belong to this school", { status: 403 });

    const results: Array<{
      student_id: string;
      status: string;
      error?: string;
      existing?: boolean;
      warning?: string;
    }> = [];

    // Update the provision function to handle existing accounts
    for (const r of rows as Row[]) {
      const sid = r.student_id?.trim();
      const firstName = r.first_name?.trim();
      const lastName = r.last_name?.trim();
      const nameDisplay = `${firstName} ${lastName}`
        .replace(/\s+/g, " ")
        .trim();
      const grade = r.grade_level?.trim();
      const parentEmail = r.parent_email?.trim();

      if (!sid || !firstName || !lastName || !grade) {
        results.push({
          student_id: sid,
          status: "error",
          error: "missing required fields",
        });
        continue;
      }

      // 1) Check if student already exists by student_id
      const { data: existingStudent } = await supa
        .from("user_profiles")
        .select("user_id, student_id")
        .eq("student_id", sid)
        .eq("role", "student")
        .single();

      let userId;

      if (existingStudent) {
        // Student exists - update their info
        userId = existingStudent.user_id;

        // Update student profile
        await supa
          .from("user_profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            display_name: nameDisplay,
            grade_level: grade,
            school_id,
            roles: ["student"], // Ensure roles array is correct
          })
          .eq("user_id", userId);
      } else {
        // Create new student - use same format as signup
        const email = `${sid}+${school_slug}@example.org`;
        const password = `${school_slug}:${sid}:${nameDisplay.toLowerCase()}`;

        const authRes = await supa.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            student_id: sid,
            display_name: nameDisplay,
            role: "student",
            school_slug,
          },
        });

        if (authRes.error || !authRes.data.user) {
          results.push({
            student_id: sid,
            status: "error",
            error: "auth create failed",
          });
          continue;
        }

        userId = authRes.data.user.id;

        // Create student profile
        await supa.from("user_profiles").upsert({
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          display_name: nameDisplay,
          role: "student",
          roles: ["student"], 
          student_id: sid,
          grade_level: grade,
          school_id,
          pronunciation: "classical",
          macrons: true,
        });
      }

      // 1.5) Sync student enrollments (similar to signup process)
      try {
        await supa.rpc("sync_student_enrollments", { p_user_id: userId });
      } catch (e) {
        // Non-fatal: enrollment sync might fail if RPC doesn't exist yet
        console.log("sync_student_enrollments error (non-fatal)", e);
      }

      // 2) Handle parent account
      if (parentEmail) {
        try {
          // Check if parent already exists by email
          const { data: existingParent, error: listErr } = await supa.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

          if (listErr) {
            console.error("Error listing users for parent check:", listErr);
            results.push({
              student_id: sid,
              status: "ok",
              existing: !!existingStudent,
              warning: "Parent check failed - could not verify existing users",
            });
            continue;
          }

          const parentUser = existingParent.users.find(
            (u: any) => u.email === parentEmail
          );

          let parentUserId;

          if (parentUser) {
            // Parent already exists in Auth - check if they've ever logged in
            parentUserId = parentUser.id;
            console.log(`Parent already exists: ${parentEmail}`);
            
            // Check if parent has ever logged in (last_sign_in_at will be null if never logged in)
            const hasLoggedIn = parentUser.last_sign_in_at !== null;
            
            // Ensure parent profile exists in user_profiles table
            await supa.from("user_profiles").upsert({
              user_id: parentUserId,
              display_name: `Parent of ${nameDisplay}`,
              role: "parent",
              roles: ["parent"],
              school_id,
              pronunciation: "classical",
              macrons: true,
              email: parentEmail,
            });

            if (!hasLoggedIn) {
              // Parent has never logged in - send invitation email to activate account
              try {
                const activationResponse = await supa.auth.admin.inviteUserByEmail(parentEmail, {
                  data: {
                    role: "parent",
                    display_name: `Parent of ${nameDisplay}`,
                    school_slug,
                  },
                  redirectTo: `http://localhost:8081/parent-signin`
                });
                console.log(`Sent activation email to existing parent: ${parentEmail}`);
                
                // Log the activation link for local development
                if (activationResponse.data.properties?.action_link) {
                  console.log(`Activation link (for local dev): ${activationResponse.data.properties.action_link}`);
                }
              } catch (inviteError) {
                console.error("Failed to send activation email to existing parent:", inviteError);
              }
            } else {
              // Parent has logged in before - send password reset as notification
              // This serves as both notification and easy way to access their account
              try {
                const linkResponse = await supa.auth.admin.generateLink({
                  type: 'recovery',
                  email: parentEmail,
                  options: {
                    redirectTo: `http://localhost:8081/parent-signin`
                  }
                });
                console.log(`Generated password reset/notification for active parent: ${parentEmail}`);
                console.log(`Recovery link (for local dev): ${linkResponse.data.properties?.action_link}`);
                console.log(`Email link (for local dev): ${linkResponse.data.properties?.email_action_link}`);
              } catch (notifyError) {
                console.error("Failed to send notification to active parent:", notifyError);
                // This is non-fatal - parent can still access their account normally
              }
            }
          } else {
            // Invite new parent account - this sends an email invitation
            const parentAuthRes = await supa.auth.admin.inviteUserByEmail(parentEmail, {
              data: {
                role: "parent",
                display_name: `Parent of ${nameDisplay}`,
                school_slug,
              },
              redirectTo: `http://localhost:8081/parent-signin`
            });

            if (parentAuthRes.error || !parentAuthRes.data.user) {
              console.error("Failed to invite parent:", parentAuthRes.error);
              results.push({
                student_id: sid,
                status: "ok",
                existing: !!existingStudent,
                warning: "Parent invitation failed",
              });
              continue;
            }

            parentUserId = parentAuthRes.data.user.id;

            // Create parent profile immediately (even before they accept the invitation)
            await supa.from("user_profiles").upsert({
              user_id: parentUserId,
              display_name: `Parent of ${nameDisplay}`,
              role: "parent",
              roles: ["parent"],
              school_id,
              pronunciation: "classical",
              macrons: true,
              email: parentEmail,
            });

            console.log(`Sent parent invitation to: ${parentEmail}`);
            
            // Log the invitation link for local development
            if (parentAuthRes.data.properties?.action_link) {
              console.log(`Invitation link (for local dev): ${parentAuthRes.data.properties.action_link}`);
            }
          }

          // Create parent-student relationship
          try {
            const { error: linkError } = await supa.from("parent_student_links").upsert({
              parent_user_id: parentUserId,
              student_user_id: userId,
              school_id,
              student_id: sid,
            });
            
            if (linkError) {
              console.error("parent_student_links error:", linkError);
              results.push({
                student_id: sid,
                status: "ok",
                existing: !!existingStudent,
                warning: "Parent account created but relationship link failed",
              });
              continue;
            } else {
              console.log("Successfully created parent_student_links relationship");
            }
          } catch (linkError) {
            console.error("parent_student_links table error:", linkError);
            results.push({
              student_id: sid,
              status: "ok",
              existing: !!existingStudent,
              warning: "Parent account created but relationship link failed",
            });
            continue;
          }

        } catch (parentError) {
          console.error("Parent account process failed:", parentError);
          results.push({
            student_id: sid,
            status: "ok",
            existing: !!existingStudent,
            warning: "Parent account creation failed",
          });
          continue;
        }
      }

      results.push({
        student_id: sid,
        status: "ok",
        existing: !!existingStudent,
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
