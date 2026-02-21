/**
 * Shared video metadata (titles, categories, tags) for seed-real-videos and assign-video-categories.
 * Schema categories: stamina | pleasure | dating | education | confidence
 */

export type SchemaCategory = 'stamina' | 'pleasure' | 'dating' | 'education' | 'confidence';
export type MetaCategory = 'stamina' | 'pleasure' | 'relationships' | 'health' | 'confidence';

export function toSchemaCategory(c: MetaCategory): SchemaCategory {
  if (c === 'relationships') return 'dating';
  if (c === 'health') return 'education';
  return c;
}

export const VIDEO_META: Record<
  string,
  { title: string; description: string; tags: string[]; category: MetaCategory }
> = {
  '001': {
    title: 'Why Emotional Grounding Strengthens Relationships',
    description: 'Stress and anger are silent relationship killers. Dr. Neha Mehta explains how emotional grounding — staying centred during conflict — builds deeper trust and intimacy with your partner.',
    tags: ['relationships', 'emotional_health', 'communication', 'mental_health', 'stress'],
    category: 'relationships',
  },
  '002': {
    title: 'Natural Ways to Boost Sexual Stamina',
    description: 'Simple home remedies and lifestyle tweaks to improve your sexual stamina and endurance. Dr. Neha Mehta shares practical, evidence-backed tips you can start today.',
    tags: ['stamina', 'performance', 'health_tips', 'natural_remedies', 'lifestyle'],
    category: 'stamina',
  },
  '003': {
    title: '4 Tips to Last Longer in Bed',
    description: 'Four practical, science-backed techniques to help you last longer during sex. Simple adjustments in breathing, pacing, and positioning that make a real difference.',
    tags: ['stamina', 'performance', 'sex_tips', 'premature_ejaculation', 'lasting_longer'],
    category: 'stamina',
  },
  '004': {
    title: 'How to Last Longer in Bed',
    description: 'Quick, effective techniques to control your arousal and last longer in bed. Methods you can apply tonight — no equipment, no supplements needed.',
    tags: ['stamina', 'performance', 'lasting_longer', 'sex_tips'],
    category: 'stamina',
  },
  '005': {
    title: 'Premature Ejaculation: Techniques That Actually Work',
    description: 'A step-by-step guide to managing premature ejaculation using clinically proven techniques like the squeeze method and the stop-start technique — giving you real, lasting control.',
    tags: ['stamina', 'premature_ejaculation', 'performance', 'sex_education', 'lasting_longer'],
    category: 'stamina',
  },
  '006': {
    title: 'Simple Tricks to Last Longer in Bed',
    description: 'Easy-to-apply methods to build control and stamina so you can enjoy sex more and leave your partner fully satisfied. No pills, no gimmicks.',
    tags: ['stamina', 'performance', 'lasting_longer', 'sex_tips'],
    category: 'stamina',
  },
  '007': {
    title: "How to Kiss: A Beginner's Guide",
    description: "Never kissed someone before? This beginner-friendly guide breaks down the basics of kissing — from reading body language to executing the perfect first kiss with confidence.",
    tags: ['relationships', 'kissing', 'dating', 'intimacy', 'first_kiss'],
    category: 'relationships',
  },
  '008': {
    title: "First Date Do's and Don'ts",
    description: "A dating coach's top tips for what to do — and what to avoid — on a first date. Small tweaks that make the difference between a second date and an awkward goodbye.",
    tags: ['relationships', 'dating', 'first_date', 'confidence', 'attraction'],
    category: 'relationships',
  },
  '009': {
    title: 'First Date Mistakes Men Always Make',
    description: 'The most common first-date blunders that kill attraction instantly — and the simple fixes that make you far more appealing. Avoid these and you are already ahead.',
    tags: ['relationships', 'dating', 'first_date', 'confidence', 'attraction'],
    category: 'relationships',
  },
  '010': {
    title: 'Why Modern Men Struggle With Attraction (Cold Truths)',
    description: 'An honest, uncomfortable look at why many modern men are struggling to attract partners — and the mindset shifts that can genuinely change your results.',
    tags: ['confidence', 'attraction', 'dating', 'mindset', 'self_improvement'],
    category: 'confidence',
  },
  '011': {
    title: 'Riskiest Sex Positions: What a Doctor Says',
    description: "A doctor explains which sexual positions carry the highest risk of penile fracture and injury — and how to enjoy adventurous sex safely without landing in the ER.",
    tags: ['health', 'sex_education', 'safety', 'anatomy', 'positions'],
    category: 'health',
  },
  '012': {
    title: 'How to Make Your First Kiss Less Awkward',
    description: 'Step-by-step tips to make your first kiss feel natural and confident, not clumsy or forced. The key is in the build-up, not the moment itself.',
    tags: ['relationships', 'kissing', 'dating', 'confidence', 'first_kiss'],
    category: 'relationships',
  },
  '013': {
    title: 'Best Kissing Techniques for Her',
    description: 'Master the art of kissing with these proven techniques that women actually love — from pacing and pressure to reading her signals in real time.',
    tags: ['relationships', 'kissing', 'pleasure', 'intimacy', 'technique'],
    category: 'relationships',
  },
  '014': {
    title: 'How to Have a Sensual Kiss',
    description: 'Elevate your kissing game with techniques that build tension, deepen connection, and turn a simple kiss into something electric and unforgettable.',
    tags: ['pleasure', 'kissing', 'intimacy', 'relationships', 'sensuality'],
    category: 'pleasure',
  },
  '015': {
    title: 'How to Go for the Kiss in 3 Steps',
    description: 'Eliminate the guesswork. These 3 simple steps tell you exactly when and how to go for a first kiss — confidently and without the awkward "should I or shouldn\'t I" spiral.',
    tags: ['relationships', 'kissing', 'dating', 'confidence', 'first_kiss'],
    category: 'relationships',
  },
  '016': {
    title: 'Will Sex Hurt the First Time?',
    description: "An honest, medically accurate answer to one of the most common questions about first-time sex — including why pain sometimes happens and how to make the experience as comfortable as possible.",
    tags: ['health', 'first_time_sex', 'sex_education', 'pain', 'anatomy'],
    category: 'health',
  },
  '017': {
    title: 'Can You Get Pregnant from Dry Humping?',
    description: 'A doctor answers this surprisingly common question with clear, factual information about pregnancy risk during outercourse — separating genuine concern from myth.',
    tags: ['health', 'pregnancy', 'sex_education', 'contraception', 'outercourse'],
    category: 'health',
  },
  '018': {
    title: 'Can Women Orgasm from Anal Sex?',
    description: "The science behind anal pleasure for women — including why some women can orgasm through anal stimulation, how it anatomically works, and what it actually feels like.",
    tags: ['pleasure', 'health', 'sex_education', 'orgasm', 'anatomy', 'female_pleasure'],
    category: 'pleasure',
  },
  '019': {
    title: 'How to Take Care of Your Penis the Right Way',
    description: 'A practical guide to maintaining good penile health — covering daily hygiene basics, what to watch out for, and which symptoms you should never ignore.',
    tags: ['health', 'penis_health', 'hygiene', 'anatomy', 'mens_health'],
    category: 'health',
  },
  '020': {
    title: 'Can You Get Pregnant If He Was Inside for Just 5 Seconds?',
    description: "A doctor gives a straight, science-based answer to this very common worry — explaining how conception actually works and what level of exposure truly poses a risk.",
    tags: ['health', 'pregnancy', 'sex_education', 'contraception', 'conception'],
    category: 'health',
  },
  '021': {
    title: 'Is Squirting Just Pee? A Doctor Explains',
    description: 'The science of female ejaculation explained clearly and without shame. What squirting actually is, what it contains, what triggers it — and why it is completely normal.',
    tags: ['health', 'pleasure', 'female_anatomy', 'sex_education', 'orgasm', 'squirting'],
    category: 'health',
  },
  '022': {
    title: 'Why You Feel Like You Need to Pee During Sex',
    description: "That urge to urinate during sex is far more common than anyone talks about. Here's exactly what is happening in your body during those moments — and what to do about it.",
    tags: ['health', 'female_anatomy', 'sex_education', 'pleasure', 'anatomy'],
    category: 'health',
  },
  '023': {
    title: 'First Time Sex: What You Must Know (Doctor\'s Advice)',
    description: 'Dr. Rajeshwari Reddy covers the essential precautions before first-time sex — from consent and lubrication to contraception and managing expectations about pain.',
    tags: ['health', 'first_time_sex', 'sex_education', 'safety', 'contraception', 'consent'],
    category: 'health',
  },
  '024': {
    title: 'The Right Way to Open a Condom',
    description: 'Most people have never been properly taught how to open a condom correctly. This quick guide covers what they definitely did not teach you in school — and why it matters.',
    tags: ['health', 'contraception', 'safe_sex', 'sex_education', 'condom'],
    category: 'health',
  },
  '025': {
    title: 'Is First Time Sex Painful?',
    description: 'What to actually expect physically during first-time sex, why pain sometimes occurs, and how to prepare so it can be a more comfortable and positive experience.',
    tags: ['health', 'first_time_sex', 'sex_education', 'pain', 'anatomy'],
    category: 'health',
  },
  '026': {
    title: 'How to Find the G-Spot',
    description: "Leeza Mangaldas demystifies the G-spot — exactly where it is, how to locate it, and the best ways to stimulate it for maximum female pleasure. No myths, just anatomy.",
    tags: ['pleasure', 'female_anatomy', 'orgasm', 'g_spot', 'sex_tips', 'technique'],
    category: 'pleasure',
  },
  '027': {
    title: 'Can You Satisfy a Partner with a Small Penis?',
    description: "The honest, evidence-based truth about penis size and sexual satisfaction — and why technique, confidence, and emotional connection matter infinitely more than size.",
    tags: ['confidence', 'body_image', 'sex_tips', 'performance', 'pleasure', 'penis_size'],
    category: 'confidence',
  },
  '028': {
    title: 'How to Wear a Condom Correctly',
    description: 'A clear, step-by-step visual guide to putting on a condom the right way — because wearing it incorrectly means it will not protect you from STIs or pregnancy.',
    tags: ['health', 'safe_sex', 'contraception', 'sex_education', 'condom'],
    category: 'health',
  },
  '029': {
    title: 'The Flirting Trick Nobody Tells You',
    description: 'One simple, powerful flirting technique that creates instant attraction and genuine interest — and almost nobody has been told about it.',
    tags: ['relationships', 'flirting', 'attraction', 'dating', 'technique'],
    category: 'relationships',
  },
  '030': {
    title: 'How to Flirt with a Guy Over Text',
    description: "Texting techniques to build attraction, keep him curious, and gradually turn casual conversation into something more — without coming on too strong.",
    tags: ['relationships', 'flirting', 'dating', 'texting', 'attraction'],
    category: 'relationships',
  },
  '031': {
    title: 'How to Flirt with a Man (That Actually Works)',
    description: 'A relationship coach explains natural, authentic ways to flirt with a man that create genuine attraction — without feeling try-hard or desperate.',
    tags: ['relationships', 'flirting', 'attraction', 'dating', 'communication'],
    category: 'relationships',
  },
  '032': {
    title: 'How to Flirt with a Girl Over Text',
    description: 'The right way to text a girl you like — what to say, how to playfully tease, and how to build tension without being creepy or coming on too strong.',
    tags: ['relationships', 'flirting', 'dating', 'texting', 'attraction'],
    category: 'relationships',
  },
  '033': {
    title: 'How to Approach Girls: 3 Steps That Always Work',
    description: 'A simple, repeatable 3-step framework for approaching women in real life. Effective, respectful, and designed so that it works consistently — not just once.',
    tags: ['confidence', 'dating', 'approach', 'attraction', 'social_skills'],
    category: 'confidence',
  },
  '034': {
    title: 'How to Approach Women with Confidence',
    description: "A dating coach breaks down the body language and mindset that help you walk up to any woman with genuine, calm confidence — not nervous energy.",
    tags: ['confidence', 'dating', 'approach', 'mindset', 'body_language'],
    category: 'confidence',
  },
  '035': {
    title: 'How to Approach a Girl Confidently',
    description: 'Step-by-step guide to approaching a girl without freezing up — including exactly what to say in the first few seconds, and how to handle rejection gracefully.',
    tags: ['confidence', 'dating', 'approach', 'attraction', 'social_skills'],
    category: 'confidence',
  },
  '036': {
    title: 'Is Masturbation Actually Good for You?',
    description: 'The science-backed benefits of masturbation — from stress relief and better sleep to improved sexual self-awareness and even a stronger immune system.',
    tags: ['health', 'masturbation', 'sex_education', 'mental_health', 'wellbeing'],
    category: 'health',
  },
  '037': {
    title: 'What Happens to Your Body When You Stop Masturbating',
    description: 'The real physical and psychological effects of stopping masturbation — separating solid science from the myths and misinformation floating around online.',
    tags: ['health', 'masturbation', 'sex_education', 'mental_health', 'nofap'],
    category: 'health',
  },
};
