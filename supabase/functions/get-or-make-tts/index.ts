import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";
import { latinToIPA } from "./latin-phonetics.ts";

// Types
interface TTSRequest {
  text: string;
  dialect: 'classical' | 'ecclesiastical';
  kind?: 'word' | 'sentence';
  item_id?: string;
  voice_model?: string;
  speed?: number;
}

interface TTSResponse {
  url: string;
  cached: boolean;
  duration_ms?: number;
}

// Voice configuration for high-quality Latin
const VOICE_CONFIG = {
  classical: {
    model: "eleven_multilingual_v2",
    voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel - clear, scholarly voice
    stability: 0.75,
    similarity_boost: 0.8,
    style: 0.2 // More controlled delivery
  },
  ecclesiastical: {
    model: "eleven_multilingual_v2", 
    voice_id: "AZnzlk1XvdvUeBnXmlld", // Domi - warm, Italian-influenced
    stability: 0.8,
    similarity_boost: 0.75,
    style: 0.3 // Slightly more expressive for church Latin
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  // CORS handling
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
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY")!;

    if (!supabaseUrl || !serviceRoleKey || !elevenLabsKey) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request
    const { text, dialect, kind = 'word', item_id, voice_model, speed = 1.0 }: TTSRequest = await req.json();
    
    if (!text || !dialect) {
      return new Response(JSON.stringify({ error: "Missing required fields: text, dialect" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Normalize and hash the text
    const normalizedText = text.trim().toLowerCase();
    const voiceConfig = VOICE_CONFIG[dialect];
    const effectiveVoiceModel = voice_model || voiceConfig.model;
    
    // Create a unique key for caching
    const cacheKey = JSON.stringify({ 
      text: normalizedText, 
      dialect, 
      voice_model: effectiveVoiceModel, 
      speed 
    });
    
    const textHash = await crypto.subtle.digest(
      'SHA-256', 
      new TextEncoder().encode(cacheKey)
    ).then(buf => 
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );

    // Check cache first
    const { data: cached } = await supabase
      .from('audio_assets')
      .select('*')
      .eq('language_code', 'la')
      .eq('dialect', dialect)
      .eq('text_hash', textHash)
      .eq('voice_model', effectiveVoiceModel)
      .eq('speed', speed)
      .maybeSingle();

    if (cached) {
      // Use public URL for cached items (more reliable than signed URLs)
      const { data: publicUrlData } = supabase.storage
        .from('audio')
        .getPublicUrl(cached.storage_path);

      const freshAudioUrl = publicUrlData.publicUrl;

      // Update item media with fresh URL if item_id provided
      if (item_id) {
        await updateItemAudio(supabase, item_id, dialect, freshAudioUrl);
      }
      
      return new Response(JSON.stringify({ 
        url: freshAudioUrl, 
        cached: true,
        duration_ms: cached.duration_ms 
      }), {
        headers: corsHeaders()
      });
    }

    // Generate IPA phonetics
    const ipa = latinToIPA(normalizedText, dialect);
    console.log(`Generating TTS for "${normalizedText}" -> IPA: "${ipa}" (${dialect})`);

    // Create SSML with proper phonetic markup
    const ssml = createSSML(normalizedText, ipa, dialect, voiceConfig, speed);
    
    // Generate speech using Azure TTS
    const audioBuffer = await generateElevenLabsTTS(normalizedText, ipa, dialect, voiceConfig, elevenLabsKey, speed);
    
    // Store in Supabase Storage
    const fileName = `${textHash}.mp3`;
    const storagePath = `tts/${dialect}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(storagePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL instead of signed URL
    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Estimate duration (rough calculation: ~150 words per minute for Latin)
    const estimatedDuration = Math.round((normalizedText.split(' ').length / 150) * 60 * 1000);

    // Store metadata in database
    const { error: dbError } = await supabase
      .from('audio_assets')
      .insert({
        language_code: 'la',
        dialect,
        text_hash: textHash,
        text_original: text,
        storage_path: storagePath,
        storage_url: publicUrl, // Store the public URL
        item_id,
        kind,
        voice_model: effectiveVoiceModel,
        speed,
        duration_ms: estimatedDuration
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Non-fatal - we still have the audio file
    }

    // Update item media if item_id provided
    if (item_id) {
      await updateItemAudio(supabase, item_id, dialect, publicUrl);
    }

    return new Response(JSON.stringify({ 
      url: publicUrl, 
      cached: false,
      duration_ms: estimatedDuration 
    }), {
      headers: corsHeaders()
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: corsHeaders()
    });
  }
});

// Helper functions
function createSSML(text: string, ipa: string, dialect: string, voiceConfig: any, speed: number): string {
  const prosodyRate = speed === 1.0 ? 'medium' : speed < 1.0 ? 'slow' : 'fast';
  
  return `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voiceConfig.language}">
      <voice name="${voiceConfig.voice}">
        <prosody rate="${prosodyRate}" pitch="medium">
          <phoneme alphabet="ipa" ph="${ipa}">${text}</phoneme>
        </prosody>
      </voice>
    </speak>
  `.trim();
}

async function generateElevenLabsTTS(text: string, ipa: string, dialect: string, voiceConfig: any, apiKey: string, speed: number): Promise<Uint8Array> {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voice_id}`;
  
  // For better Latin pronunciation, we can include IPA hints in the text
  // ElevenLabs is smart enough to handle phonetic guides
  const enhancedText = `${text}`; // Keep it simple for now
  
  const requestBody = {
    text: enhancedText,
    model_id: voiceConfig.model,
    voice_settings: {
      stability: voiceConfig.stability,
      similarity_boost: voiceConfig.similarity_boost,
      style: voiceConfig.style || 0.2,
      use_speaker_boost: true
    },
    output_format: "mp3_44100_128" // Specify format explicitly
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${response.status} - ${errorText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function updateItemAudio(supabase: any, itemId: string, dialect: string, audioUrl: string) {
  try {
    console.log(`Updating item ${itemId} with ${dialect} audio: ${audioUrl}`);
    
    // Get current media
    const { data: currentItem } = await supabase
      .from('items')
      .select('media')
      .eq('id', itemId)
      .single();

    console.log('Current item media:', currentItem?.media);

    const audioKey = dialect === 'classical' ? 'audio_classical' : 'audio_ecclesiastical';
    const updatedMedia = {
      ...(currentItem?.media || {}),
      [audioKey]: audioUrl
    };

    console.log('Updated media will be:', updatedMedia);

    // Update with merged media
    const { error } = await supabase
      .from('items')
      .update({ media: updatedMedia })
      .eq('id', itemId);

    if (error) {
      console.error('Failed to update item audio:', error);
    } else {
      console.log('Successfully updated item media');
    }
  } catch (error) {
    console.error('Error updating item audio:', error);
  }
}