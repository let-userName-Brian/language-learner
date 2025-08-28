import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, name } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user exists in auth.users by querying user_profiles
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email, display_name')
      .eq('email', email)
      .eq('role', 'parent')
      .maybeSingle();

    if (profileError) {
      console.error('Error checking user profile:', profileError);
      throw new Error('Failed to check user profile');
    }

    const tempPassword = `temp_${Date.now()}`;
    
    console.log('=== DEV LOGIN INFO ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${tempPassword}`);
    console.log(`User ID: ${existingProfile?.user_id || 'NEW USER'}`);
    console.log('=====================');

    if (existingProfile && existingProfile.user_id) {
      // User exists in auth - update their password
      const { data, error: updateError } = await supabase.auth.admin.updateUserById(
        existingProfile.user_id,
        { 
          password: tempPassword,
          email_confirm: true
        }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Dev mode: Password updated. Check console for login credentials',
          devCredentials: {
            email: email,
            password: tempPassword,
            userId: existingProfile.user_id
          }
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parent account not found. Please contact support.',
        }),
        { status: 404, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
