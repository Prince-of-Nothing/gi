import { supabase } from './supabaseClient.js';

const cache = new Map();

export async function loadTaxonomyTerms(categories = null) {
  const key = categories ? categories.slice().sort().join('|') : '*';
  if (cache.has(`terms:${key}`)) return cache.get(`terms:${key}`);

  let query = supabase
    .from('gidireads_taxonomy_terms')
    .select('id,name,slug,category,parent_id,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (categories?.length) query = query.in('category', categories);

  const { data, error } = await query;
  if (error) throw error;
  const terms = data || [];
  cache.set(`terms:${key}`, terms);
  return terms;
}

export async function loadStoryTaxonomy(storyIds) {
  const ids = [...new Set((storyIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from('story_taxonomy')
    .select('story_id, term_id, relationship_type, gidireads_taxonomy_terms(id,name,slug,category,parent_id,sort_order)')
    .in('story_id', ids);
  if (error) throw error;

  const map = new Map(ids.map((id) => [id, []]));
  for (const row of data || []) {
    const term = row.gidireads_taxonomy_terms;
    if (!term) continue;
    map.get(row.story_id)?.push({
      ...term,
      relationship_type: row.relationship_type,
    });
  }
  return map;
}

export function mergeLegacyTaxonomy(story, relations = []) {
  const result = {
    primary_genre: story?.primary_genre || '',
    secondary_genres: story?.secondary_genre
      ? String(story.secondary_genre).split(',').map((x) => x.trim()).filter(Boolean)
      : [],
    subgenres: [],
    tropes: [],
    tags: Array.isArray(story?.tags) ? story.tags.filter(Boolean) : [],
    audience: [],
    settings: [],
    regions: [],
    formats: [],
  };

  for (const term of relations || []) {
    const name = term.name;
    switch (term.relationship_type) {
      case 'primary_genre': result.primary_genre = name; break;
      case 'secondary_genre': if (!result.secondary_genres.includes(name)) result.secondary_genres.push(name); break;
      case 'subgenre': if (!result.subgenres.includes(name)) result.subgenres.push(name); break;
      case 'trope': if (!result.tropes.includes(name)) result.tropes.push(name); break;
      case 'tag': if (!result.tags.includes(name)) result.tags.push(name); break;
      case 'audience': if (!result.audience.includes(name)) result.audience.push(name); break;
      case 'setting': if (!result.settings.includes(name)) result.settings.push(name); break;
      case 'region': if (!result.regions.includes(name)) result.regions.push(name); break;
      case 'format': if (!result.formats.includes(name)) result.formats.push(name); break;
    }
  }

  return result;
}

export function taxonomyValues(taxonomy) {
  return [
    taxonomy.primary_genre,
    ...(taxonomy.secondary_genres || []),
    ...(taxonomy.subgenres || []),
    ...(taxonomy.tropes || []),
    ...(taxonomy.tags || []),
    ...(taxonomy.audience || []),
    ...(taxonomy.settings || []),
    ...(taxonomy.regions || []),
    ...(taxonomy.formats || []),
  ].filter(Boolean).map((x) => String(x).toLowerCase());
}
