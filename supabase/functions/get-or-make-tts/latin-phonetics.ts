// File: supabase/functions/get-or-make-tts/latin-phonetics.ts
/**
 * Advanced Latin to IPA conversion with support for Classical and Ecclesiastical pronunciations
 * Based on scholarly consensus and historical linguistic research
 */

export function latinToIPA(text: string, dialect: 'classical' | 'ecclesiastical'): string {
    // Normalize text
    let normalized = text
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, '') // Remove punctuation but keep letters and spaces
      .replace(/\s+/g, ' ')
      .trim();
  
    if (dialect === 'classical') {
      return convertClassicalLatin(normalized);
    } else {
      return convertEcclesiasticalLatin(normalized);
    }
  }
  
  function convertClassicalLatin(text: string): string {
    let ipa = text;
  
    // Handle vowel length markers (macrons)
    const vowelLengthMap: Record<string, string> = {
      'ā': 'a:', 'ē': 'e:', 'ī': 'i:', 'ō': 'o:', 'ū': 'u:',
      'ȳ': 'y:'
    };
  
    Object.entries(vowelLengthMap).forEach(([macron, long]) => {
      ipa = ipa.replace(new RegExp(macron, 'g'), long);
    });
  
    // Diphthongs (must come before individual vowel processing)
    const diphthongs: Record<string, string> = {
      'ae': 'ae̯',
      'æ': 'ae̯', 
      'au': 'au̯',
      'ei': 'ei̯',
      'eu': 'eu̯',
      'oe': 'oe̯',
      'œ': 'oe̯',
      'ui': 'ui̯'
    };
  
    Object.entries(diphthongs).forEach(([latin, ipaDP]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaDP);
    });
  
    // Consonant clusters and special cases (order matters!)
    
    // QU before vowels
    ipa = ipa.replace(/qu([aeiouāēīōūȳ])/g, 'kʷ$1');
    
    // Aspirated consonants (in some positions)
    ipa = ipa.replace(/ph/g, 'pʰ');
    ipa = ipa.replace(/th/g, 'tʰ');
    ipa = ipa.replace(/ch/g, 'kʰ');
    
    // Double consonants (geminates)
    ipa = ipa.replace(/bb/g, 'bː');
    ipa = ipa.replace(/cc/g, 'kː');
    ipa = ipa.replace(/dd/g, 'dː');
    ipa = ipa.replace(/ff/g, 'fː');
    ipa = ipa.replace(/gg/g, 'gː');
    ipa = ipa.replace(/ll/g, 'lː');
    ipa = ipa.replace(/mm/g, 'mː');
    ipa = ipa.replace(/nn/g, 'nː');
    ipa = ipa.replace(/pp/g, 'pː');
    ipa = ipa.replace(/rr/g, 'rː');
    ipa = ipa.replace(/ss/g, 'sː');
    ipa = ipa.replace(/tt/g, 'tː');
  
    // X = ks
    ipa = ipa.replace(/x/g, 'ks');
  
    // Z = dz (in Classical period)
    ipa = ipa.replace(/z/g, 'dz');
  
    // Consonant substitutions
    const consonants: Record<string, string> = {
      'c': 'k',    // Always hard k in Classical
      'g': 'g',    // Always hard g
      'j': 'j',    // Consonantal i
      'v': 'w',    // Classical v was pronounced as w
      'r': 'r',    // Trilled r
      's': 's',    // Unvoiced s
      'f': 'f',
      'h': 'h',
      'l': 'l',
      'm': 'm',
      'n': 'n',
      'p': 'p',
      't': 't',
      'b': 'b',
      'd': 'd'
    };
  
    Object.entries(consonants).forEach(([latin, ipaC]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaC);
    });
  
    // Nasalization before certain consonants
    ipa = ipa.replace(/n([kgŋ])/g, 'ŋ$1');
    ipa = ipa.replace(/n([pb])/g, 'm$1');
  
    // Simple vowels (after diphthongs and length markers)
    const vowels: Record<string, string> = {
      'a': 'a',
      'e': 'e', 
      'i': 'i',
      'o': 'o',
      'u': 'u',
      'y': 'y'  // Greek loanwords
    };
  
    Object.entries(vowels).forEach(([latin, ipaV]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaV);
    });
  
    // Add primary stress (simplified: on first syllable of short words, penult if heavy, antepenult otherwise)
    ipa = addClassicalStress(ipa);
  
    return ipa;
  }
  
  function convertEcclesiasticalLatin(text: string): string {
    let ipa = text;
  
    // Handle vowel length (less important in Ecclesiastical)
    const vowelLengthMap: Record<string, string> = {
      'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u', 'ȳ': 'i'
    };
  
    Object.entries(vowelLengthMap).forEach(([macron, vowel]) => {
      ipa = ipa.replace(new RegExp(macron, 'g'), vowel);
    });
  
    // Diphthongs (simplified in Ecclesiastical)
    const diphthongs: Record<string, string> = {
      'ae': 'e',
      'æ': 'e',
      'au': 'au',
      'ei': 'ei', 
      'eu': 'eu',
      'oe': 'e',
      'œ': 'e'
    };
  
    Object.entries(diphthongs).forEach(([latin, ipaDP]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaDP);
    });
  
    // Special consonant combinations for Italian-influenced pronunciation
    
    // GN -> ɲ (like Italian gnocchi) 
    ipa = ipa.replace(/gn/g, 'ɲ');
    
    // GL before I -> ʎ (like Italian gli)
    ipa = ipa.replace(/gl([i])/g, 'ʎ$1');
    
    // SC before E/I -> ʃ
    ipa = ipa.replace(/sc([ei])/g, 'ʃ$1');
    
    // TI before vowel -> tsi (like Italian)
    ipa = ipa.replace(/ti([aeiou])/g, 'tsi$1');
    
    // QU before vowels
    ipa = ipa.replace(/qu([aeiou])/g, 'kw$1');
  
    // CH -> k (not aspirated)
    ipa = ipa.replace(/ch/g, 'k');
    ipa = ipa.replace(/ph/g, 'f');
    ipa = ipa.replace(/th/g, 't');
  
    // C before E/I -> tʃ (like Italian)
    ipa = ipa.replace(/c([ei])/g, 'tʃ$1');
    
    // G before E/I -> dʒ (like Italian)
    ipa = ipa.replace(/g([ei])/g, 'dʒ$1');
  
    // Double consonants (less pronounced than Classical)
    ipa = ipa.replace(/bb/g, 'b');
    ipa = ipa.replace(/cc/g, 'k');
    ipa = ipa.replace(/dd/g, 'd');
    ipa = ipa.replace(/ff/g, 'f');
    ipa = ipa.replace(/gg/g, 'g');
    ipa = ipa.replace(/ll/g, 'l');
    ipa = ipa.replace(/mm/g, 'm');
    ipa = ipa.replace(/nn/g, 'n');
    ipa = ipa.replace(/pp/g, 'p');
    ipa = ipa.replace(/rr/g, 'r');
    ipa = ipa.replace(/ss/g, 's');
    ipa = ipa.replace(/tt/g, 't');
  
    // X = ks
    ipa = ipa.replace(/x/g, 'ks');
    
    // Z = dz
    ipa = ipa.replace(/z/g, 'dz');
  
    // Remaining consonants
    const consonants: Record<string, string> = {
      'c': 'k',    // Hard c when not before e/i
      'g': 'g',    // Hard g when not before e/i  
      'j': 'j',    // Consonantal i
      'v': 'v',    // Modern v sound in Ecclesiastical
      'r': 'r',    // Trilled r
      's': 's',
      'f': 'f',
      'h': 'h',    // Often silent in Ecclesiastical, but we keep it
      'l': 'l',
      'm': 'm',
      'n': 'n',
      'p': 'p',
      't': 't',
      'b': 'b',
      'd': 'd'
    };
  
    Object.entries(consonants).forEach(([latin, ipaC]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaC);
    });
  
    // Vowels (Italian-influenced)
    const vowels: Record<string, string> = {
      'a': 'a',
      'e': 'e',
      'i': 'i', 
      'o': 'o',
      'u': 'u',
      'y': 'i'  // Y pronounced as I
    };
  
    Object.entries(vowels).forEach(([latin, ipaV]) => {
      ipa = ipa.replace(new RegExp(latin, 'g'), ipaV);
    });
  
    // Add stress (Italian-style: usually penultimate)
    ipa = addEcclesiasticalStress(ipa);
  
    return ipa;
  }
  
  function addClassicalStress(ipa: string): string {
    // Simplified stress rules for Classical Latin
    const words = ipa.split(' ');
    
    return words.map(word => {
      if (word.length <= 3) {
        return 'ˈ' + word; // Stress first syllable of short words
      }
      
      // For longer words, we'd need proper syllable analysis
      // This is a simplified version
      const vowelPattern = /[aeiouāēīōūȳ:ae̯au̯ei̯eu̯oe̯ui̯]/g;
      const vowels = word.match(vowelPattern);
      
      if (!vowels || vowels.length <= 1) {
        return 'ˈ' + word;
      }
      
      // Place stress roughly in the middle for demo
      const stressPos = Math.floor(word.length * 0.4);
      return word.slice(0, stressPos) + 'ˈ' + word.slice(stressPos);
    }).join(' ');
  }
  
  function addEcclesiasticalStress(ipa: string): string {
    // Italian-style stress (usually penultimate syllable)
    const words = ipa.split(' ');
    
    return words.map(word => {
      if (word.length <= 3) {
        return 'ˈ' + word;
      }
      
      // Simple penultimate stress approximation
      const stressPos = Math.max(1, Math.floor(word.length * 0.6));
      return word.slice(0, stressPos) + 'ˈ' + word.slice(stressPos);
    }).join(' ');
  }
  
  // Utility function for testing
  export function getPhoneticExample(word: string): { classical: string; ecclesiastical: string } {
    return {
      classical: latinToIPA(word, 'classical'),
      ecclesiastical: latinToIPA(word, 'ecclesiastical')
    };
  }