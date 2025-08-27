export type LessonRow = {
    id: string;
    title: string;
    unit_id: string;
    order: number;
  };
  
  export type ItemRow = {
    id: string;
    lesson_id: string;
    kind: "sentence" | "vocab" | "picture-match" | "tile-build";
    latin: string;
    accepted_english: string[]; // jsonb
    lemmas: string[];           // jsonb
    morph: any[];               // keep loose for now
    media?: { image?: string; audio_classical?: string; audio_ecclesiastical?: string };
  };
  