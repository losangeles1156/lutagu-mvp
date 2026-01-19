/**
 * L4 Knowledge Base Vector Embedding Seeder
 *
 * This script generates embeddings for L4 knowledge entries and stores them
 * in the database for semantic search.
 *
 * Usage: npx tsx scripts/seed_l4_embeddings.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  RAILWAY_EXPERT_TIPS,
  HUB_STATION_TIPS,
  ACCESSIBILITY_GUIDE,
  SPECIAL_LOCATION_TIPS,
  PASS_RECOMMENDATIONS
} from '../src/lib/l4/expertKnowledgeBase';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const EMBEDDING_MODEL = 'embedding-001'; // Google Gemini embedding model
const EMBEDDING_DIMENSIONS = 768;
const BATCH_SIZE = 5; // Process in batches to avoid rate limits

/**
 * Generate embedding using Google Gemini API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, using placeholder embedding');
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text }] }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding?.values || new Array(EMBEDDING_DIMENSIONS).fill(0);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

/**
 * Prepare knowledge entries for seeding
 */
function prepareRailwayKnowledge() {
  const entries: any[] = [];

  for (const [railwayId, tips] of Object.entries(RAILWAY_EXPERT_TIPS)) {
    const railwayName = railwayId.split('.').pop() || railwayId;

    for (const tip of tips) {
      entries.push({
        knowledge_type: 'railway',
        entity_id: railwayId,
        entity_name: { 'zh-TW': railwayName, 'ja': railwayName, 'en': railwayName },
        content: tip.text,
        icon: tip.icon,
        category: tip.category,
        subcategory: null,
        time_context: tip.category === 'crowd' ? ['weekday-morning', 'weekday-evening'] : [],
        user_context: tip.category === 'accessibility' ? ['general', 'wheelchair'] : ['general'],
        ward_context: []
      });
    }
  }

  return entries;
}

function prepareHubStationKnowledge() {
  const entries: any[] = [];

  for (const [stationId, tips] of Object.entries(HUB_STATION_TIPS)) {
    const stationName = stationId.split('.').pop() || stationId;

    for (const tip of tips) {
      // Determine user context from category
      const userContext = tip.category === 'accessibility'
        ? ['wheelchair', 'stroller', 'largeLuggage', 'senior']
        : ['general'];

      entries.push({
        knowledge_type: 'hub_station',
        entity_id: stationId,
        entity_name: { 'zh-TW': stationName, 'ja': stationName, 'en': stationName },
        content: tip.text,
        icon: tip.icon,
        category: tip.category,
        subcategory: null,
        time_context: tip.category === 'crowd' ? ['weekday-morning', 'weekday-evening', 'holiday'] : [],
        user_context: userContext,
        ward_context: []
      });
    }
  }

  return entries;
}

function prepareAccessibilityKnowledge() {
  const entries: any[] = [];

  for (const [stationId, advice] of Object.entries(ACCESSIBILITY_GUIDE)) {
    const stationName = stationId.split('.').pop() || stationId;

    // Add each accessibility type as separate entry
    const accessibilityTypes = [
      { key: 'wheelchair', context: ['wheelchair'] },
      { key: 'stroller', context: ['stroller'] },
      { key: 'largeLuggage', context: ['largeLuggage'] },
      { key: 'vision', context: ['vision'] },
      { key: 'senior', context: ['senior'] }
    ];

    for (const { key, context } of accessibilityTypes) {
      if (advice[key as keyof typeof advice]) {
        entries.push({
          knowledge_type: 'accessibility',
          entity_id: stationId,
          entity_name: { 'zh-TW': stationName, 'ja': stationName, 'en': stationName },
          content: advice[key as keyof typeof advice] || '',
          icon: '🛗',
          category: 'accessibility',
          subcategory: key,
          time_context: [],
          user_context: context,
          ward_context: []
        });
      }
    }
  }

  return entries;
}

function prepareSpecialLocationKnowledge() {
  const entries: any[] = [];

  for (const [locationId, tips] of Object.entries(SPECIAL_LOCATION_TIPS)) {
    const locationName = locationId.replace(/-/g, ' ');

    for (const tip of tips) {
      const userContext = tip.category === 'airport'
        ? ['largeLuggage', 'stroller']
        : ['general'];

      entries.push({
        knowledge_type: 'special_location',
        entity_id: locationId,
        entity_name: { 'zh-TW': locationName, 'ja': locationName, 'en': locationName },
        content: tip.text,
        icon: tip.icon,
        category: tip.category,
        subcategory: null,
        time_context: tip.category === 'airport' ? ['weekday-morning', 'weekday-evening'] : [],
        user_context: userContext,
        ward_context: []
      });
    }
  }

  return entries;
}

function preparePassKnowledge() {
  const entries: any[] = [];

  for (const pass of PASS_RECOMMENDATIONS) {
    entries.push({
      knowledge_type: 'pass',
      entity_id: pass.id,
      entity_name: { 'zh-TW': pass.name, 'ja': pass.nameJa, 'en': pass.name },
      content: `${pass.coverage} - ${pass.whenToUse}`,
      icon: pass.icon,
      category: 'pass',
      subcategory: null,
      time_context: [],
      user_context: ['general'],
      ward_context: []
    });
  }

  return entries;
}

/**
 * Seed L4 knowledge embeddings
 */
async function seedL4Embeddings() {
  console.log('🚀 Starting L4 Knowledge Embeddings Seeding...');

  // Collect all knowledge entries
  const allEntries = [
    ...prepareRailwayKnowledge(),
    ...prepareHubStationKnowledge(),
    ...prepareAccessibilityKnowledge(),
    ...prepareSpecialLocationKnowledge(),
    ...preparePassKnowledge()
  ];

  console.log(`📊 Total entries to process: ${allEntries.length}`);

  let successCount = 0;
  let errorCount = 0;

  // Process in batches
  for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
    const batch = allEntries.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allEntries.length / BATCH_SIZE)}`);

    for (const entry of batch) {
      try {
        // Generate embedding for the content
        const embedding = await generateEmbedding(entry.content);

        // Upsert to database
        const { error } = await supabase
          .from('l4_knowledge_embeddings')
          .upsert({
            knowledge_type: entry.knowledge_type,
            entity_id: entry.entity_id,
            entity_name: entry.entity_name,
            content: entry.content,
            icon: entry.icon,
            category: entry.category,
            subcategory: entry.subcategory,
            time_context: entry.time_context,
            user_context: entry.user_context,
            ward_context: entry.ward_context,
            embedding: embedding,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'knowledge_type, entity_id, content',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Error seeding ${entry.entity_id}:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception seeding ${entry.entity_id}:`, err);
        errorCount++;
      }
    }

    // Rate limiting delay
    if (i + BATCH_SIZE < allEntries.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('✅ Seeding complete!');
  console.log(`📈 Success: ${successCount}, Errors: ${errorCount}`);
  console.log(`📊 Total L4 knowledge entries: ${allEntries.length}`);
}

seedL4Embeddings().catch(console.error);
