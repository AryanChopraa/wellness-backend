/**
 * Seed sample Exercises, Videos, Communities, and (optional) Posts for the enhanced wellness workflow.
 *
 * Required for:
 * - GET /assessment/plan, dashboard: Exercise docs with tags/goalTags/severityLevels
 * - GET /videos, recommended feed: Video docs
 * - Community topic boards: Community docs (optional but recommended)
 *
 * Usage:
 *   npx ts-node -r dotenv/config src/scripts/seed-wellness-data.ts
 *
 * Options:
 *   --skip-exercises    Only seed videos, communities, (and posts if SEED_USER_ID set)
 *   --skip-videos       Only seed exercises, communities, (and posts if SEED_USER_ID set)
 *   --skip-communities  Do not seed topic-board communities
 *   --reset             Delete existing exercises/videos before inserting (use with care)
 *                       Communities and posts are never deleted by --reset.
 *
 * Optional env:
 *   SEED_USER_ID        If set, create sample posts in "general" as this user (MongoDB ObjectId).
 */

import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db';
import { Exercise } from '../models/Exercise';
import { Video } from '../models/Video';
import { Community } from '../models/Community';
import { Post } from '../models/Post';

const SKIP_EXERCISES = process.argv.includes('--skip-exercises');
const SKIP_VIDEOS = process.argv.includes('--skip-videos');
const SKIP_COMMUNITIES = process.argv.includes('--skip-communities');
const RESET = process.argv.includes('--reset');

// ---------------------------------------------------------------------------
// Sample exercises (tags/goalTags match assessment enums; severityLevels 1-5)
// ---------------------------------------------------------------------------
const SAMPLE_EXERCISES = [
  {
    title: 'Name Your Fear',
    description: 'Write down specific moments when anxiety shows up. This helps externalize the fear.',
    type: 'journaling' as const,
    durationMinutes: 5,
    tags: ['performance', 'anxiety'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['confident_intimate', 'less_anxiety'],
    phase: 1,
    order: 1,
  },
  {
    title: '4-7-8 Breathing',
    description: 'Learn a research-backed breathing technique to calm anxiety in the moment.',
    type: 'guided_audio' as const,
    durationMinutes: 8,
    tags: ['stress', 'anxiety', 'mental_health'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['less_anxiety', 'healthy_habits'],
    phase: 1,
    order: 2,
  },
  {
    title: 'Challenging Negative Thoughts',
    description: 'Identify and reframe thoughts that fuel anxiety. A short CBT-style exercise.',
    type: 'interactive' as const,
    durationMinutes: 10,
    tags: ['anxiety', 'mental_health'],
    severityLevels: [3, 4, 5],
    goalTags: ['less_anxiety', 'enjoying_without_overthinking'],
    phase: 1,
    order: 3,
  },
  {
    title: 'Body Scan Relaxation',
    description: 'Guided body scan to release tension and increase body awareness.',
    type: 'guided_audio' as const,
    durationMinutes: 12,
    tags: ['body_image', 'stress', 'anxiety'],
    severityLevels: [2, 3, 4],
    goalTags: ['body_confidence', 'less_anxiety'],
    phase: 2,
    order: 1,
  },
  {
    title: 'Communication Script Builder',
    description: 'Practice what to say to your partner in a safe, low-pressure way.',
    type: 'interactive' as const,
    durationMinutes: 10,
    tags: ['communication', 'relationships'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['better_communication'],
    phase: 2,
    order: 2,
  },
  {
    title: 'Confidence Reflection',
    description: 'Short journaling prompt: What does confidence feel like to you?',
    type: 'journaling' as const,
    durationMinutes: 5,
    tags: ['confidence', 'body_image'],
    severityLevels: [1, 2, 3, 4],
    goalTags: ['confident_intimate', 'body_confidence', 'feeling_normal'],
    phase: 2,
    order: 3,
  },
  {
    title: 'Week 1 Integration',
    description: 'Review your week: one thing that helped and one small win.',
    type: 'micro_lesson' as const,
    durationMinutes: 5,
    tags: ['stress', 'mental_health', 'exploring'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['healthy_habits', 'feeling_normal'],
    phase: 1,
    order: 7,
  },
  {
    title: 'Daily Check-in Habit',
    description: 'Rate your mood 1-10 and note one thing you are grateful for.',
    type: 'challenge' as const,
    durationMinutes: 3,
    tags: ['stress', 'mental_health', 'loneliness'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['healthy_habits'],
    phase: 1,
    order: 4,
  },
  // More variety for different concerns and goals
  {
    title: 'Letter to Your Anxiety',
    description: 'Write a short letter to your anxiety as if it were a person. Helps create distance and perspective.',
    type: 'journaling' as const,
    durationMinutes: 7,
    tags: ['anxiety', 'mental_health', 'exploring'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['less_anxiety', 'enjoying_without_overthinking'],
    phase: 1,
    order: 5,
  },
  {
    title: 'Progressive Muscle Relaxation',
    description: 'Tense and release muscle groups to reduce physical tension and anxiety.',
    type: 'guided_audio' as const,
    durationMinutes: 15,
    tags: ['stress', 'anxiety', 'performance'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['less_anxiety', 'confident_intimate'],
    phase: 2,
    order: 4,
  },
  {
    title: 'Opening Up: What to Say',
    description: 'Practice one sentence you could use to start a conversation with your partner.',
    type: 'interactive' as const,
    durationMinutes: 8,
    tags: ['communication', 'relationships'],
    severityLevels: [2, 3, 4],
    goalTags: ['better_communication'],
    phase: 2,
    order: 5,
  },
  {
    title: 'Body Kindness Check-in',
    description: 'Notice one thing your body did for you today. No judgment, just observation.',
    type: 'journaling' as const,
    durationMinutes: 5,
    tags: ['body_image', 'confidence'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['body_confidence', 'feeling_normal'],
    phase: 2,
    order: 6,
  },
  {
    title: 'Sexual Health Basics: Fact Check',
    description: 'Short, evidence-based read on common myths and facts. Build knowledge at your own pace.',
    type: 'micro_lesson' as const,
    durationMinutes: 6,
    tags: ['sexual_health', 'education', 'exploring'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['healthy_habits', 'feeling_normal'],
    phase: 1,
    order: 6,
  },
  {
    title: 'Grounding in the Moment',
    description: '5-4-3-2-1 sensory grounding when you feel overwhelmed or disconnected.',
    type: 'guided_audio' as const,
    durationMinutes: 5,
    tags: ['anxiety', 'stress', 'mental_health'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['less_anxiety'],
    phase: 1,
    order: 8,
  },
  {
    title: 'Small Win from This Week',
    description: 'Name one small step you took, even if it felt tiny. Progress is progress.',
    type: 'journaling' as const,
    durationMinutes: 4,
    tags: ['confidence', 'exploring', 'loneliness'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['feeling_normal', 'healthy_habits'],
    phase: 2,
    order: 7,
  },
  {
    title: 'Boundaries: Saying No Once',
    description: 'Reflect on one situation where you could say no (or yes) without guilt.',
    type: 'challenge' as const,
    durationMinutes: 5,
    tags: ['communication', 'confidence', 'relationships'],
    severityLevels: [2, 3, 4],
    goalTags: ['better_communication', 'confident_intimate'],
    phase: 3,
    order: 1,
  },
  {
    title: 'Connection Without Pressure',
    description: 'Ideas for low-pressure ways to feel closer to a partner or to yourself.',
    type: 'micro_lesson' as const,
    durationMinutes: 7,
    tags: ['relationships', 'loneliness', 'social_wellness'],
    severityLevels: [1, 2, 3, 4],
    goalTags: ['better_communication', 'healthy_habits'],
    phase: 3,
    order: 2,
  },
  {
    title: 'It\'s Not All in Your Head',
    description: 'Short lesson on the mind-body connection and why your feelings are valid.',
    type: 'micro_lesson' as const,
    durationMinutes: 5,
    tags: ['mental_health', 'education', 'anxiety'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['feeling_normal', 'less_anxiety'],
    phase: 1,
    order: 9,
  },
];

// ---------------------------------------------------------------------------
// Sample videos (YouTube IDs – replace with real IDs or use url/asset)
// ---------------------------------------------------------------------------
const SAMPLE_VIDEOS = [
  {
    title: 'Understanding Performance Anxiety',
    description: 'A brief overview of how anxiety shows up and why it is common and treatable.',
    duration: '5:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['performance', 'anxiety', 'education'],
    fearAddressed: 'broken_abnormal',
    severityLevels: [2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Breathing for Calm',
    description: 'Simple breathing techniques you can use anytime.',
    duration: '6:30',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['stress', 'anxiety', 'mental_health'],
    fearAddressed: 'never_get_better',
    severityLevels: [1, 2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Talking to Your Partner',
    description: 'How to start a conversation about intimacy and concerns.',
    duration: '8:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['communication', 'relationships'],
    fearAddressed: 'partner_will_leave',
    severityLevels: [2, 3, 4],
    relationshipFilter: ['yes_havent_shared', 'complicated'],
    viewCount: 0,
  },
  {
    title: 'Body Confidence Basics',
    description: 'Shifting how you see and feel in your body.',
    duration: '7:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['body_image', 'confidence'],
    fearAddressed: 'never_confident',
    severityLevels: [2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'You Are Not Alone',
    description: 'Stories from others who felt the same way and found support.',
    duration: '4:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['loneliness', 'social_wellness', 'mental_health'],
    fearAddressed: 'alone_in_this',
    severityLevels: [1, 2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Why Change Is Possible',
    description: 'The science of habit and mindset change when it comes to anxiety and confidence.',
    duration: '6:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['education', 'anxiety', 'confidence'],
    fearAddressed: 'never_get_better',
    severityLevels: [1, 2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'You\'re Not Broken',
    description: 'Normalizing experiences and statistics that show how common these feelings are.',
    duration: '5:30',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['education', 'mental_health', 'sexual_health'],
    fearAddressed: 'broken_abnormal',
    severityLevels: [2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Building Trust in Your Relationship',
    description: 'How to strengthen communication so both partners feel safe and heard.',
    duration: '8:30',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['communication', 'relationships'],
    fearAddressed: 'partner_will_leave',
    severityLevels: [2, 3, 4],
    viewCount: 0,
  },
  {
    title: 'Small Steps to Greater Confidence',
    description: 'Practical ways to build confidence in intimate situations, one step at a time.',
    duration: '7:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['confidence', 'performance'],
    fearAddressed: 'never_confident',
    severityLevels: [2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'When It Feels Like It\'s All in Your Head',
    description: 'Understanding the mind-body link and why your experience is real and valid.',
    duration: '5:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['mental_health', 'education', 'anxiety'],
    fearAddressed: 'all_in_my_head',
    severityLevels: [2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Stress and Intimacy',
    description: 'How stress affects the body and what you can do to ease it.',
    duration: '6:00',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['stress', 'mental_health', 'performance'],
    fearAddressed: 'never_get_better',
    severityLevels: [1, 2, 3, 4, 5],
    viewCount: 0,
  },
  {
    title: 'Exploring at Your Own Pace',
    description: 'Gentle intro to learning more about sexual wellness without pressure.',
    duration: '4:30',
    thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    source: 'youtube' as const,
    externalId: 'jNQXAC9IVRw',
    videoUrl: null,
    tags: ['sexual_health', 'education', 'exploring'],
    fearAddressed: 'broken_abnormal',
    severityLevels: [1, 2, 3],
    viewCount: 0,
  },
];

// ---------------------------------------------------------------------------
// Topic-board communities (from enhanced workflow doc)
// ---------------------------------------------------------------------------
const TOPIC_COMMUNITIES = [
  { name: 'General', slug: 'general', description: 'The main community for everyone. Share, discuss, and connect.' },
  { name: 'Performance & Confidence', slug: 'performance-confidence', description: 'Discuss performance anxiety, confidence building, and feeling more at ease.' },
  { name: 'Communication & Relationships', slug: 'communication-relationships', description: 'Talking with partners, setting boundaries, and relationship dynamics.' },
  { name: 'Body Image & Self-Love', slug: 'body-image-self-love', description: 'Body confidence, self-compassion, and feeling good in your skin.' },
  { name: 'Sexual Health Q&A', slug: 'sexual-health-qa', description: 'Questions and evidence-based information about sexual wellness.' },
  { name: 'Wins & Progress', slug: 'wins-progress', description: 'Celebrate small wins and share your progress. Every step counts.' },
  { name: 'Managing Anxiety', slug: 'managing-anxiety', description: 'Coping with anxiety, stress, and overthinking in a supportive space.' },
];

// ---------------------------------------------------------------------------
// Sample posts (only created when SEED_USER_ID is set)
// ---------------------------------------------------------------------------
function getSamplePosts(communityId: mongoose.Types.ObjectId, authorId: mongoose.Types.ObjectId) {
  return [
    { communityId, authorId, title: 'First week done – what helped me', content: 'I just finished the first 7 days. The breathing exercise in the morning made a real difference. Anyone else try it?', postType: 'progress_update' as const, tags: ['anxiety', 'stress'] },
    { communityId, authorId, title: 'How do I bring this up with my partner?', content: 'I want to talk about what I\'m going through but I don\'t know where to start. Any advice?', postType: 'question' as const, tags: ['communication', 'relationships'] },
    { communityId, authorId, title: 'You\'re not alone', content: 'If you\'re reading this and feeling like you\'re the only one – you\'re not. This community helped me realize that.', postType: 'story' as const, tags: ['loneliness', 'social_wellness'] },
    { communityId, authorId, title: 'Resource that helped: grounding technique', content: 'The 5-4-3-2-1 exercise in the app really helps when I spiral. Sharing in case it helps someone else.', postType: 'resource_share' as const, tags: ['anxiety', 'mental_health'] },
    { communityId, authorId, title: 'Small win today', content: 'I actually did the 5-minute journaling without skipping. Small but it counts.', postType: 'progress_update' as const, tags: ['confidence', 'healthy_habits'] },
    { communityId, authorId, title: 'Struggling this week – seeking support', content: 'Having a rough patch. Not looking for advice, just needed to say it somewhere safe.', postType: 'seeking_support' as const, tags: ['stress', 'mental_health'] },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await connectDb();

  if (RESET) {
    if (!SKIP_EXERCISES) {
      const delEx = await Exercise.deleteMany({});
      console.log('Deleted exercises:', delEx.deletedCount);
    }
    if (!SKIP_VIDEOS) {
      const delV = await Video.deleteMany({});
      console.log('Deleted videos:', delV.deletedCount);
    }
  }

  if (!SKIP_EXERCISES) {
    const existingCount = await Exercise.countDocuments({});
    if (existingCount > 0) {
      console.log('Exercises already exist (' + existingCount + '). Skipping exercise seed. Use --reset to replace.');
    } else {
      await Exercise.insertMany(SAMPLE_EXERCISES);
      console.log('Inserted', SAMPLE_EXERCISES.length, 'sample exercises.');
    }
  }

  if (!SKIP_VIDEOS) {
    const existingCount = await Video.countDocuments({});
    if (existingCount > 0) {
      console.log('Videos already exist (' + existingCount + '). Skipping video seed. Use --reset to replace.');
    } else {
      await Video.insertMany(SAMPLE_VIDEOS);
      console.log('Inserted', SAMPLE_VIDEOS.length, 'sample videos.');
    }
  }

  if (!SKIP_COMMUNITIES) {
    let created = 0;
    for (const c of TOPIC_COMMUNITIES) {
      const existing = await Community.findOne({ slug: c.slug }).lean();
      if (!existing) {
        await Community.create(c);
        created++;
      }
    }
    if (created > 0) {
      console.log('Created', created, 'topic communities. Total topic boards:', TOPIC_COMMUNITIES.length);
    } else {
      console.log('Topic communities already exist. Skipping.');
    }
  }

  const seedUserId = process.env.SEED_USER_ID?.trim();
  if (seedUserId && mongoose.Types.ObjectId.isValid(seedUserId)) {
    const general = await Community.findOne({ slug: 'general' }).lean();
    if (general) {
      const authorId = new mongoose.Types.ObjectId(seedUserId);
      const existingPost = await Post.findOne({ authorId, communityId: general._id }).lean();
      if (!existingPost) {
        const samplePosts = getSamplePosts((general as { _id: mongoose.Types.ObjectId })._id, authorId);
        await Post.insertMany(samplePosts);
        console.log('Inserted', samplePosts.length, 'sample posts (SEED_USER_ID).');
      } else {
        console.log('Sample posts already exist for this user. Skipping.');
      }
    } else {
      console.log('No "general" community found. Run seed without --skip-communities first, or create general community.');
    }
  }

  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
