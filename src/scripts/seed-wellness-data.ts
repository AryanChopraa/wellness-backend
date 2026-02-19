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
import { Asset } from '../models/Asset';
import { Community } from '../models/Community';
import { Post } from '../models/Post';
import { User } from '../models/User';

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
    content: 'Take 5 minutes to write without editing.\n\n**Prompt:** When did anxiety or worry show up recently? Name one specific moment (e.g. “yesterday before the call” or “when I thought about…”). What did you feel in your body? What did you tell yourself?\n\nNaming it helps separate the experience from “who you are.” You can write in a note, on paper, or here. No one else will see it.',
  },
  {
    title: '4-7-8 Breathing',
    description: 'Learn a research-backed breathing technique to calm anxiety in the moment.',
    type: 'guided_audio' as const,
    displayType: 'breathing' as const,
    durationMinutes: 8,
    tags: ['stress', 'anxiety', 'mental_health'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['less_anxiety', 'healthy_habits'],
    phase: 1,
    order: 2,
    content: 'Find a comfortable seat. Breathe in through your nose for 4 counts. Hold for 7 counts. Breathe out slowly through your mouth for 8 counts. Repeat this cycle 4 times. Keep your breath smooth and steady. If 4-7-8 feels too long, use 3-4-6 or 2-3-4.',
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
    content: '**Step 1:** Notice one thought that’s making you anxious (e.g. “I’ll mess this up” or “They’ll think I’m weird”). Write it down.\n\n**Step 2:** Ask: Is this thought a fact or an interpretation? What would a supportive friend say?\n\n**Step 3:** Write a kinder or more balanced version (e.g. “I might feel nervous, and I can still try” or “I don’t know what they think; I’m doing my best”).\n\nYou don’t have to believe the new thought fully—just practice offering yourself an alternative.',
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
    content: '**Prompt:** What does confidence feel like in your body? When have you felt even a little bit of it—in any area of life? Describe that moment in a few sentences.\n\nThere’s no right answer. Noticing what confidence feels like for you makes it easier to recognize and build on it next time.',
  },
  {
    title: 'Week 1 Integration',
    description: 'Review your week: one thing that helped and one small win.',
    type: 'micro_lesson' as const,
    displayType: 'read' as const,
    durationMinutes: 5,
    tags: ['stress', 'mental_health', 'exploring'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['healthy_habits', 'feeling_normal'],
    phase: 1,
    order: 7,
    content: 'Take a moment to look back on your week.\n\n**One thing that helped:** What practice, thought, or moment made a positive difference—even a small one?\n\n**One small win:** What did you do that you’re glad you did? Progress doesn’t have to be big to count.\n\nWriting these down helps your brain notice what’s working. You can return to this list when things feel harder.',
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
    content: '**Prompt:** Write a short letter to your anxiety as if it were a person. You might say what you notice when it shows up, what you wish it knew, or how you’d like your relationship with it to change. You can be honest, frustrated, or gentle—whatever feels true.\n\nThis isn’t for anyone else to read. The goal is to create a bit of distance so anxiety feels less like “you” and more like something you can observe and work with.',
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
    content: '**Prompt:** Name one thing your body did for you today. It could be small: carried you somewhere, let you taste food, gave you a deep breath, helped you hug someone. No judgment—just one observation.\n\nIf that feels hard, try: “My body is here with me right now.” That counts.',
  },
  {
    title: 'Sexual Health Basics: Fact Check',
    description: 'Short, evidence-based read on common myths and facts. Build knowledge at your own pace.',
    type: 'micro_lesson' as const,
    displayType: 'read' as const,
    durationMinutes: 6,
    tags: ['sexual_health', 'education', 'exploring'],
    severityLevels: [1, 2, 3, 4, 5],
    goalTags: ['healthy_habits', 'feeling_normal'],
    phase: 1,
    order: 6,
    content: '**Myth:** Everyone else has it figured out.\n**Fact:** Anxiety, ups and downs, and questions are very common. Many people don’t talk about it openly.\n\n**Myth:** It’s all in your head.\n**Fact:** Your body and mind are connected. Stress, anxiety, and health can all affect how you feel. That’s normal and treatable.\n\n**Myth:** You’re the only one struggling.\n**Fact:** A large number of people experience similar concerns. Getting good information and support is a sign of strength.',
  },
  {
    title: 'Grounding in the Moment',
    description: '5-4-3-2-1 sensory grounding when you feel overwhelmed or disconnected.',
    type: 'guided_audio' as const,
    displayType: 'breathing' as const,
    durationMinutes: 5,
    tags: ['anxiety', 'stress', 'mental_health'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['less_anxiety'],
    phase: 1,
    order: 8,
    content: 'Use your senses to come back to the present. Say out loud or in your head:\n\n**5** things you can see (e.g. a window, your hands, the floor).\n**4** things you can touch (e.g. the chair, your feet on the ground).\n**3** things you can hear (e.g. traffic, your breath).\n**2** things you can smell (or 2 breaths if nothing stands out).\n**1** thing you can taste (or sip of water).\n\nTake your time. This simple exercise can help when you feel overwhelmed or spaced out.',
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
    displayType: 'read' as const,
    durationMinutes: 7,
    tags: ['relationships', 'loneliness', 'social_wellness'],
    severityLevels: [1, 2, 3, 4],
    goalTags: ['better_communication', 'healthy_habits'],
    phase: 3,
    order: 2,
    content: 'Connection doesn’t have to mean one big conversation or one kind of intimacy.\n\n**Low-pressure ideas:** A short walk together. One thing you appreciated about them today. A shared playlist or show. Sitting in the same room without screens. A hug or hand on the shoulder.\n\n**With yourself:** A few minutes of stillness. A kind sentence in the mirror. Writing one thing you’re grateful for about your body or mind.\n\nSmall, consistent moments often build trust more than rare big gestures.',
  },
  {
    title: 'It\'s Not All in Your Head',
    description: 'Short lesson on the mind-body connection and why your feelings are valid.',
    type: 'micro_lesson' as const,
    displayType: 'read' as const,
    durationMinutes: 5,
    tags: ['mental_health', 'education', 'anxiety'],
    severityLevels: [2, 3, 4, 5],
    goalTags: ['feeling_normal', 'less_anxiety'],
    phase: 1,
    order: 9,
    content: 'Stress and anxiety show up in your body: tension, restlessness, tight chest, or fatigue. That’s the mind–body link—it’s real, not “just in your head.”\n\nWhen we say “it’s not all in your head,” we mean: your experience is valid. What you feel physically and emotionally is information, not a flaw. Many people experience the same. Understanding this can be the first step toward feeling more in control and seeking support that helps.',
  },
];

// ---------------------------------------------------------------------------
// Reel video metadata (asset-only; assets created at seed time)
// ---------------------------------------------------------------------------
const REEL_BASE_URL = process.env.SEED_REEL_BASE_URL || 'https://storage.googleapis.com/wellness-reels';
const SEED_VIDEO_USER_EMAIL = 'seed-videos@wellness-platform.local';

const SAMPLE_REEL_METADATA: Array<{
  title: string;
  description: string;
  duration: string;
  durationSeconds: number;
  tags: string[];
  fearAddressed: string | null;
  severityLevels: number[];
  relationshipFilter?: string[];
}> = [
    { title: 'Understanding Performance Anxiety', description: 'How anxiety shows up and why it\'s treatable.', duration: '0:45', durationSeconds: 45, tags: ['performance', 'anxiety', 'education'], fearAddressed: 'broken_abnormal', severityLevels: [2, 3, 4, 5] },
    { title: 'Breathing for Calm', description: 'Simple breathing you can use anytime.', duration: '0:60', durationSeconds: 60, tags: ['stress', 'anxiety', 'mental_health'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Talking to Your Partner', description: 'How to start the conversation.', duration: '0:50', durationSeconds: 50, tags: ['communication', 'relationships'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4], relationshipFilter: ['yes_havent_shared', 'complicated'] },
    { title: 'Body Confidence Basics', description: 'Shifting how you see and feel in your body.', duration: '0:55', durationSeconds: 55, tags: ['body_image', 'confidence'], fearAddressed: 'never_confident', severityLevels: [2, 3, 4, 5] },
    { title: 'You Are Not Alone', description: 'Others felt the same and found support.', duration: '0:40', durationSeconds: 40, tags: ['loneliness', 'social_wellness', 'mental_health'], fearAddressed: 'alone_in_this', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Why Change Is Possible', description: 'Habit and mindset change for anxiety and confidence.', duration: '0:50', durationSeconds: 50, tags: ['education', 'anxiety', 'confidence'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'You\'re Not Broken', description: 'How common these feelings are.', duration: '0:45', durationSeconds: 45, tags: ['education', 'mental_health', 'sexual_health'], fearAddressed: 'broken_abnormal', severityLevels: [2, 3, 4, 5] },
    { title: 'Building Trust', description: 'Communication so both partners feel safe.', duration: '0:55', durationSeconds: 55, tags: ['communication', 'relationships'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4] },
    { title: 'Small Steps to Confidence', description: 'One step at a time.', duration: '0:50', durationSeconds: 50, tags: ['confidence', 'performance'], fearAddressed: 'never_confident', severityLevels: [2, 3, 4, 5] },
    { title: 'It\'s Not All in Your Head', description: 'Mind-body link and why your experience is valid.', duration: '0:45', durationSeconds: 45, tags: ['mental_health', 'education', 'anxiety'], fearAddressed: 'all_in_my_head', severityLevels: [2, 3, 4, 5] },
    { title: 'Stress and Intimacy', description: 'How stress affects the body and what helps.', duration: '0:50', durationSeconds: 50, tags: ['stress', 'mental_health', 'performance'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Exploring at Your Pace', description: 'Gentle intro to sexual wellness.', duration: '0:40', durationSeconds: 40, tags: ['sexual_health', 'education', 'exploring'], fearAddressed: 'broken_abnormal', severityLevels: [1, 2, 3] },
    { title: 'One Breath at a Time', description: 'Quick grounding when you\'re overwhelmed.', duration: '0:30', durationSeconds: 30, tags: ['anxiety', 'stress'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Name the Fear', description: 'Naming it takes away some of its power.', duration: '0:45', durationSeconds: 45, tags: ['performance', 'anxiety'], fearAddressed: 'broken_abnormal', severityLevels: [2, 3, 4, 5] },
    { title: 'What Would You Tell a Friend?', description: 'Self-compassion in 60 seconds.', duration: '0:60', durationSeconds: 60, tags: ['confidence', 'mental_health'], fearAddressed: 'alone_in_this', severityLevels: [1, 2, 3, 4] },
    { title: 'Opening Up: One Sentence', description: 'One sentence to start the conversation.', duration: '0:40', durationSeconds: 40, tags: ['communication', 'relationships'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4] },
    { title: 'Body Kindness', description: 'One thing your body did for you today.', duration: '0:35', durationSeconds: 35, tags: ['body_image', 'confidence'], fearAddressed: 'never_confident', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Progress Is Not Linear', description: 'Bad days don\'t erase good ones.', duration: '0:45', durationSeconds: 45, tags: ['mental_health', 'exploring'], fearAddressed: 'never_get_better', severityLevels: [2, 3, 4, 5] },
    { title: 'Boundaries in 60 Seconds', description: 'Saying no without guilt.', duration: '0:60', durationSeconds: 60, tags: ['communication', 'confidence'], fearAddressed: 'alone_in_this', severityLevels: [2, 3, 4] },
    { title: 'Calm Down Your Nervous System', description: 'Quick reset when anxiety spikes.', duration: '0:50', durationSeconds: 50, tags: ['anxiety', 'stress', 'mental_health'], fearAddressed: 'all_in_my_head', severityLevels: [2, 3, 4, 5] },
    { title: 'Partners Want to Understand', description: 'Why opening up can bring you closer.', duration: '0:45', durationSeconds: 45, tags: ['relationships', 'communication'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4] },
    { title: 'Myth vs Fact', description: 'One common myth about sexual wellness.', duration: '0:40', durationSeconds: 40, tags: ['sexual_health', 'education'], fearAddressed: 'broken_abnormal', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Today\'s Small Win', description: 'One small step still counts.', duration: '0:30', durationSeconds: 30, tags: ['confidence', 'exploring'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'When to Pause', description: 'It\'s okay to slow down.', duration: '0:45', durationSeconds: 45, tags: ['stress', 'mental_health'], fearAddressed: 'alone_in_this', severityLevels: [2, 3, 4, 5] },
    { title: 'Your Story Isn\'t Over', description: 'Hope in 60 seconds.', duration: '0:60', durationSeconds: 60, tags: ['mental_health', 'loneliness'], fearAddressed: 'never_get_better', severityLevels: [2, 3, 4, 5] },
    { title: '5-4-3-2-1 Grounding', description: 'Quick sensory grounding.', duration: '0:50', durationSeconds: 50, tags: ['anxiety', 'stress'], fearAddressed: 'all_in_my_head', severityLevels: [2, 3, 4, 5] },
    { title: 'Sleep and Wellness', description: 'How rest supports your journey.', duration: '0:45', durationSeconds: 45, tags: ['stress', 'healthy_habits'], fearAddressed: null, severityLevels: [1, 2, 3, 4, 5] },
    { title: 'When Thoughts Loop', description: 'A simple way to interrupt rumination.', duration: '0:40', durationSeconds: 40, tags: ['anxiety', 'mental_health'], fearAddressed: 'all_in_my_head', severityLevels: [2, 3, 4, 5] },
    { title: 'Asking for Support', description: 'It\'s brave to ask.', duration: '0:50', durationSeconds: 50, tags: ['communication', 'loneliness'], fearAddressed: 'alone_in_this', severityLevels: [1, 2, 3, 4] },
    { title: 'Intimacy Without Pressure', description: 'Connection at your pace.', duration: '0:55', durationSeconds: 55, tags: ['relationships', 'performance'], fearAddressed: 'never_confident', severityLevels: [2, 3, 4] },
    { title: 'Three Things That Helped', description: 'Reflect on what\'s working.', duration: '0:45', durationSeconds: 45, tags: ['exploring', 'mental_health'], fearAddressed: null, severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Rest Is Part of the Plan', description: 'Why rest isn\'t laziness.', duration: '0:40', durationSeconds: 40, tags: ['stress', 'body_image'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4] },
    { title: 'Rejection and Resilience', description: 'Bouncing back in 60 seconds.', duration: '0:60', durationSeconds: 60, tags: ['confidence', 'relationships'], fearAddressed: 'partner_will_leave', severityLevels: [3, 4, 5] },
    { title: 'Curiosity Over Judgment', description: 'Noticing without judging yourself.', duration: '0:45', durationSeconds: 45, tags: ['body_image', 'exploring'], fearAddressed: 'broken_abnormal', severityLevels: [2, 3, 4, 5] },
    { title: 'One Affirmation', description: 'A single phrase to carry today.', duration: '0:30', durationSeconds: 30, tags: ['confidence', 'anxiety'], fearAddressed: 'never_confident', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'What "Better" Looks Like', description: 'Your version of progress.', duration: '0:50', durationSeconds: 50, tags: ['exploring', 'mental_health'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Safe Space in Your Mind', description: 'Creating a mental safe space.', duration: '0:55', durationSeconds: 55, tags: ['anxiety', 'mental_health'], fearAddressed: 'all_in_my_head', severityLevels: [2, 3, 4, 5] },
    { title: 'Movement and Mood', description: 'How gentle movement helps.', duration: '0:45', durationSeconds: 45, tags: ['stress', 'body_image'], fearAddressed: null, severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Partner Check-In', description: 'One question to ask your partner.', duration: '0:40', durationSeconds: 40, tags: ['communication', 'relationships'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4] },
    { title: 'Permission to Not Be Okay', description: 'You don\'t have to be fine today.', duration: '0:35', durationSeconds: 35, tags: ['mental_health', 'loneliness'], fearAddressed: 'alone_in_this', severityLevels: [2, 3, 4, 5] },
    { title: 'Next Small Step', description: 'The smallest possible next move.', duration: '0:40', durationSeconds: 40, tags: ['confidence', 'exploring'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
    { title: 'Gratitude in 30 Seconds', description: 'One thing you\'re grateful for.', duration: '0:30', durationSeconds: 30, tags: ['stress', 'mental_health'], fearAddressed: null, severityLevels: [1, 2, 3, 4, 5] },
    { title: 'When to Seek Professional Help', description: 'Signs it\'s time to reach out.', duration: '0:60', durationSeconds: 60, tags: ['mental_health', 'education'], fearAddressed: 'never_get_better', severityLevels: [3, 4, 5] },
    { title: 'You\'re Allowed to Change', description: 'Growth isn\'t betrayal.', duration: '0:45', durationSeconds: 45, tags: ['relationships', 'confidence'], fearAddressed: 'partner_will_leave', severityLevels: [2, 3, 4] },
    { title: 'Quieting the Inner Critic', description: 'One reframe when you\'re hard on yourself.', duration: '0:50', durationSeconds: 50, tags: ['body_image', 'anxiety'], fearAddressed: 'broken_abnormal', severityLevels: [2, 3, 4, 5] },
    { title: 'Connection Without Sex', description: 'Intimacy is more than one thing.', duration: '0:45', durationSeconds: 45, tags: ['relationships', 'sexual_health'], fearAddressed: 'never_confident', severityLevels: [2, 3, 4] },
    { title: 'Tomorrow Is a New Day', description: 'A short reset for sleep or tomorrow.', duration: '0:40', durationSeconds: 40, tags: ['stress', 'mental_health'], fearAddressed: 'never_get_better', severityLevels: [1, 2, 3, 4, 5] },
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
      await Video.deleteMany({});
      const seedUser = await User.findOne({ email: SEED_VIDEO_USER_EMAIL }).lean();
      if (seedUser) {
        const delA = await Asset.deleteMany({ userId: (seedUser as { _id: mongoose.Types.ObjectId })._id, name: /^reel-/ });
        console.log('Deleted seed reel assets:', delA.deletedCount);
      }
      console.log('Deleted videos.');
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
      let seedUserId: mongoose.Types.ObjectId;
      let u = await User.findOne({ email: SEED_VIDEO_USER_EMAIL }).lean();
      if (!u) {
        const newUser = await User.create({
          email: SEED_VIDEO_USER_EMAIL,
          username: 'seed_videos',
        });
        seedUserId = (newUser as { _id: mongoose.Types.ObjectId })._id;
        console.log('Created seed user for reel assets.');
      } else {
        seedUserId = (u as { _id: mongoose.Types.ObjectId })._id;
      }
      const assetDocs: Array<{ userId: mongoose.Types.ObjectId; assetProvider: string; bucket: string; path: string; url: string; mimeType: string; name: string }> = [];
      for (let i = 0; i < SAMPLE_REEL_METADATA.length; i++) {
        const name = `reel-${i + 1}.mp4`;
        assetDocs.push({
          userId: seedUserId,
          assetProvider: 'google',
          bucket: 'wellness-reels',
          path: `reels/${name}`,
          url: `${REEL_BASE_URL}/reels/${name}`,
          mimeType: 'video/mp4',
          name,
        });
      }
      const insertedAssets = await Asset.insertMany(assetDocs);
      const videoDocs = SAMPLE_REEL_METADATA.map((meta, i) => ({
        title: meta.title,
        description: meta.description,
        duration: meta.duration,
        durationSeconds: meta.durationSeconds,
        thumbnailUrl: '',
        source: 'asset' as const,
        assetId: (insertedAssets[i] as { _id: mongoose.Types.ObjectId })._id,
        format: 'reel' as const,
        tags: meta.tags,
        fearAddressed: meta.fearAddressed,
        severityLevels: meta.severityLevels,
        relationshipFilter: meta.relationshipFilter ?? [],
        viewCount: 0,
        isActive: true,
      }));
      await Video.insertMany(videoDocs);
      console.log('Inserted', videoDocs.length, 'reel videos (asset-only).');
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
