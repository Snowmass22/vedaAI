import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { Assignment, QuestionPaper, Section, Question, QuestionType } from '@veda-ai/types';
import { PromptBuilder } from './prompt';

// Zod schemas for validation
const QuestionZodSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['mcq', 'short', 'long', 'true_false']),
  options: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  marks: z.number().positive(),
  section: z.string(),
  sampleAnswer: z.string().optional()
});

const SectionZodSchema = z.object({
  title: z.string(),
  instruction: z.string(),
  questions: z.array(QuestionZodSchema)
});

const QuestionPaperZodSchema = z.object({
  title: z.string(),
  timeLimit: z.number().positive(),
  totalMarks: z.number().positive(),
  sections: z.array(SectionZodSchema)
});

/**
 * Strips potential markdown formatting wrappers (like ```json ... ```)
 * that models occasionally output.
 */
const cleanRawResponse = (raw: string): string => {
  let cleaned = raw.trim();
  
  // Remove markdown json block wrappers
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
};

/**
 * Generates an educational, highly professional Mock assessment when
 * no GEMINI_API_KEY is supplied.
 */
// ─── Rich question template banks for the mock generator ─────────────────────

const MCQ_TEMPLATES: Array<(topic: string, subject: string, grade: string, i: number) => { text: string; options: string[]; answer: string }> = [
  (t, s, g, i) => ({
    text: `Which of the following BEST describes the core principle of ${t}?`,
    options: [`The systematic study of ${t} within ${s}`, `An unrelated branch of general ${s}`, `A historical context that predates ${t}`, `None of the above`],
    answer: 'Option A — It accurately describes the systematic study underpinning this concept.'
  }),
  (t, s, g, i) => ({
    text: `In the context of ${s} for Grade ${g}, ${t} is primarily used to:`,
    options: [`Explain and model real-world phenomena related to ${s}`, `Replace all other concepts in ${s}`, `Describe unrelated scientific disciplines`, `Contradict established laws of ${s}`],
    answer: 'Option A — It directly models and explains real-world phenomena in this domain.'
  }),
  (t, s, g, i) => ({
    text: `Which statement about ${t} is CORRECT according to Grade ${g} ${s} standards?`,
    options: [`${t} is a foundational element with measurable properties`, `${t} operates independently of all ${s} principles`, `${t} was recently discovered and has no historical basis`, `${t} is applicable only outside the scope of ${s}`],
    answer: 'Option A — Foundational elements have measurable, documented properties per curriculum standards.'
  }),
  (t, s, g, i) => ({
    text: `A student encounters ${t} during a ${s} experiment. The MOST appropriate next step is:`,
    options: [`Apply the standard definition of ${t} to interpret the result`, `Ignore ${t} as it is not relevant to ${s}`, `Assume the experiment has failed`, `Replace ${t} with an unrelated variable`],
    answer: 'Option A — Applying the standard definition is the methodologically correct approach.'
  }),
  (t, s, g, i) => ({
    text: `Which of the following is a key APPLICATION of ${t} in everyday ${s}?`,
    options: [`Predicting outcomes and designing systems involving ${t}`, `Eliminating the need to study ${s} further`, `Proving that ${t} has no practical relevance`, `Replacing ${s} textbooks with alternatives`],
    answer: 'Option A — Predicting outcomes is the hallmark practical application of this concept.'
  }),
  (t, s, g, i) => ({
    text: `If ${t} is increased by a factor of two in a controlled ${s} scenario, what is the MOST LIKELY effect?`,
    options: [`A proportional change in the dependent variable of the system`, `No change — ${t} has no influence on outcomes`, `The system collapses entirely`, `All other variables become irrelevant`],
    answer: 'Option A — Proportional responses are expected under controlled conditions per ${s} principles.'
  }),
  (t, s, g, i) => ({
    text: `According to Grade ${g} ${s} curriculum, ${t} differs from related concepts because:`,
    options: [`It has a unique set of properties and interactions`, `It is identical to all other concepts in ${s}`, `It has never been experimentally verified`, `It applies only to theoretical models, not real-world cases`],
    answer: 'Option A — Unique properties distinguish it from adjacent concepts in the syllabus.'
  }),
  (t, s, g, i) => ({
    text: `Which scientist or principle is MOST closely associated with the study of ${t} in ${s}?`,
    options: [`Foundational researchers who established the theoretical basis of ${t}`, `Scientists who worked in completely unrelated fields`, `Modern engineers who have no connection to ${s}`, `None — ${t} has no established research history`],
    answer: 'Option A — Core researchers laid the theoretical groundwork now studied in Grade ${g} ${s}.'
  }),
];

const TF_TEMPLATES: Array<(topic: string, subject: string, grade: string, i: number) => { text: string; answer: string }> = [
  (t, s, g, i) => ({ text: `${t} is a well-established concept taught as part of the Grade ${g} ${s} curriculum.`, answer: 'True. It is formally included in the standard Grade ' + g + ' ' + s + ' syllabus.' }),
  (t, s, g, i) => ({ text: `The principles of ${t} can be applied to solve problems in ${s}.`, answer: 'True. Its principles are directly applicable to problem-solving in this subject domain.' }),
  (t, s, g, i) => ({ text: `Understanding ${t} is unnecessary for advanced study of ${s} beyond Grade ${g}.`, answer: 'False. Mastery of ' + t + ' is foundational for higher-level concepts in ' + s + '.' }),
  (t, s, g, i) => ({ text: `${t} was introduced as a concept after the establishment of the core laws of ${s}.`, answer: 'True. Many concepts like ' + t + ' were formalized as extensions of earlier foundational laws.' }),
  (t, s, g, i) => ({ text: `In Grade ${g} ${s}, ${t} is considered too advanced for student-level problem solving.`, answer: 'False. The Grade ' + g + ' curriculum is specifically designed to introduce and apply ' + t + ' at a suitable level.' }),
  (t, s, g, i) => ({ text: `${t} can be measured, tested, or observed in a standard ${s} laboratory setting.`, answer: 'True. Laboratory activities related to ' + t + ' are a standard part of the ' + s + ' practical component.' }),
];

const SHORT_TEMPLATES: Array<(topic: string, subject: string, grade: string, i: number) => { text: string; answer: string }> = [
  (t, s, g, i) => ({ text: `Define ${t} in your own words and state its relevance to ${s} at the Grade ${g} level.`, answer: `${t} refers to the core concept in ${s} that describes [key properties]. It is relevant because it forms the basis for understanding higher-order concepts in the subject.` }),
  (t, s, g, i) => ({ text: `List THREE key properties or characteristics of ${t} as studied in ${s}.`, answer: `1. ${t} has a well-defined measurable property. 2. It interacts with other ${s} concepts in predictable ways. 3. Its study forms the basis for applied problem-solving at Grade ${g} level.` }),
  (t, s, g, i) => ({ text: `How is ${t} different from other related concepts you have studied in ${s}? Explain with one example.`, answer: `Unlike similar concepts, ${t} specifically addresses [unique aspect]. For example, in a typical ${s} problem, ${t} leads to [specific outcome] rather than [alternative].` }),
  (t, s, g, i) => ({ text: `Write a short note on the historical development or discovery of ${t} in the field of ${s}.`, answer: `The concept of ${t} was developed over time as scientists explored ${s}. Early researchers identified its key characteristics, and it was later formalized as a standard concept in the ${g} curriculum.` }),
  (t, s, g, i) => ({ text: `State one real-world application of ${t} and explain why it matters in modern ${s} contexts.`, answer: `A key real-world application of ${t} is in [field/technology]. This matters because it demonstrates how theoretical knowledge of ${s} translates directly into practical use.` }),
  (t, s, g, i) => ({ text: `What happens to a system when ${t} is removed or absent? Justify your answer using ${s} principles.`, answer: `When ${t} is absent, the system loses its [key property], leading to [consequence]. This is explained by the ${s} principle that requires ${t} for stable operation.` }),
  (t, s, g, i) => ({ text: `Describe the relationship between ${t} and at least one other concept from your ${s} syllabus.`, answer: `${t} is closely related to [other concept] in ${s}. When ${t} increases, [other concept] responds proportionally, as described by the governing equations in the syllabus.` }),
];

const LONG_TEMPLATES: Array<(topic: string, subject: string, grade: string, i: number) => { text: string; answer: string }> = [
  (t, s, g, i) => ({ text: `Write a comprehensive essay on ${t}, covering its definition, historical background, key principles, and practical applications in modern ${s}. Use diagrams or examples where appropriate.`, answer: `A comprehensive answer should include: 1) Clear definition of ${t} with formal notation. 2) Historical background and key contributors. 3) Core principles and governing laws. 4) Mathematical/theoretical framework where applicable. 5) At least two real-world examples. 6) Challenges or limitations of ${t} in applied ${s}.` }),
  (t, s, g, i) => ({ text: `Design and describe an experiment to investigate the properties of ${t} in a ${s} laboratory. Include hypothesis, materials, procedure, expected results, and potential sources of error.`, answer: `Experiment design should state: Hypothesis (e.g., "${t} will exhibit [property] under [conditions]"), Materials list, Step-by-step procedure with safety notes, Expected results table/graph, Quantitative analysis method, and at least 3 potential error sources with mitigation strategies.` }),
  (t, s, g, i) => ({ text: `Compare and contrast ${t} with two other related concepts from your ${s} syllabus. Use a structured format including similarities, differences, and a real-world scenario where each applies.`, answer: `Comparison should cover: Shared foundational properties, Key distinguishing features (at least 3 each), Real-world scenarios demonstrating each concept's unique applicability, and a summary table or Venn diagram representation.` }),
  (t, s, g, i) => ({ text: `A Grade ${g} student claims that ${t} has no practical use outside the classroom. Write a detailed rebuttal using at least THREE real-world case studies from the field of ${s}.`, answer: `Rebuttal should include: Introduction countering the claim, Case Study 1 (with data/measurements), Case Study 2 (from industry or technology), Case Study 3 (from everyday life), Conclusion reinforcing practical relevance with quantifiable impact.` }),
  (t, s, g, i) => ({ text: `Analyze the impact of ${t} on the broader field of ${s}. Discuss how advances in understanding ${t} have shaped the curriculum, technology, or society.`, answer: `Analysis should cover: Early vs. modern understanding of ${t}, Technological advancements enabled by it, Societal or environmental impact, Integration into Grade ${g} curriculum standards, and future directions for research.` }),
];

// Pick a template pseudorandomly but ensure better distribution to avoid duplicates
const pick = <T,>(arr: T[], index: number, salt: number): T => {
  // Use a prime multiplier for better distribution
  const hash = (index * 7 + salt * 13) % arr.length;
  return arr[hash];
};

const generateMockPaper = (assignment: Assignment): Omit<QuestionPaper, 'assignmentId'> => {
  const sections: Section[] = [];
  let currentSecCode = 'A';
  let aggregateMarks = 0;
  let runningIdCount = 1;
  // Salt changes every minute so re-runs of the same assignment feel different
  const timeSalt = Math.floor(Date.now() / 60000) % 97;

  for (const config of assignment.questionConfig) {
    const questions: Question[] = [];
    const secTitle = `SECTION ${currentSecCode}: ${config.type === 'mcq' ? 'Multiple Choice' : config.type === 'short' ? 'Short Answer' : config.type === 'long' ? 'Long Answer' : 'True or False'} Questions`;
    const secInstruction = `Attempt all questions in this section. Each question carries ${config.marks} mark(s).`;

    const difficulties: Array<'easy' | 'moderate' | 'hard'> = ['easy', 'moderate', 'hard'];

    for (let i = 0; i < config.count; i++) {
      let qText = '';
      let options: string[] | undefined;
      let sampleAnswer = '';
      const difficulty: 'easy' | 'moderate' | 'hard' =
        config.difficulty === 'mixed'
          ? difficulties[(i + timeSalt) % 3]
          : (config.difficulty as 'easy' | 'moderate' | 'hard');

      if (config.type === 'mcq') {
        const tmpl = pick(MCQ_TEMPLATES, i + timeSalt, runningIdCount)(assignment.topic, assignment.subject, assignment.grade, i);
        qText = tmpl.text;
        options = tmpl.options;
        sampleAnswer = tmpl.answer;
      } else if (config.type === 'true_false') {
        const tmpl = pick(TF_TEMPLATES, i + timeSalt, runningIdCount)(assignment.topic, assignment.subject, assignment.grade, i);
        qText = tmpl.text;
        options = ['True', 'False'];
        sampleAnswer = tmpl.answer;
      } else if (config.type === 'short') {
        const tmpl = pick(SHORT_TEMPLATES, i + timeSalt, runningIdCount)(assignment.topic, assignment.subject, assignment.grade, i);
        qText = tmpl.text;
        sampleAnswer = tmpl.answer;
      } else {
        const tmpl = pick(LONG_TEMPLATES, i + timeSalt, runningIdCount)(assignment.topic, assignment.subject, assignment.grade, i);
        qText = tmpl.text;
        sampleAnswer = tmpl.answer;
      }

      questions.push({
        id: `q-${runningIdCount++}`,
        text: qText,
        type: config.type,
        options,
        difficulty,
        marks: config.marks,
        section: `Section ${currentSecCode}`,
        sampleAnswer,
      });

      aggregateMarks += config.marks;
    }

    sections.push({ title: secTitle, instruction: secInstruction, questions });
    currentSecCode = String.fromCharCode(currentSecCode.charCodeAt(0) + 1);
  }

  return {
    title: `${assignment.subject} — ${assignment.topic} Assessment (Grade ${assignment.grade})`,
    subject: assignment.subject,
    grade: assignment.grade,
    timeLimit: Math.max(30, Math.min(180, Math.ceil(aggregateMarks * 2))),
    totalMarks: aggregateMarks,
    sections,
  };
};

// Models to try in order — each has its own free-tier quota bucket
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-8b',
];

/**
 * Attempt to call a specific Gemini model. Throws on failure so the
 * caller can move to the next model in the fallback chain.
 */
const tryGenerateWithModel = async (
  modelName: string,
  apiKey: string,
  prompt: string
) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });

  console.log(`[AI] Attempting generation with model: ${modelName}`);
  const result = await model.generateContent(prompt);
  return { text: result.response.text(), modelName };
};

export const generateQuestionPaper = async (
  assignment: Assignment,
  fileContent?: string
): Promise<Omit<QuestionPaper, 'assignmentId'> & { metadata: { modelUsed: string; promptTokens: number; generationTimeMs: number } }> => {
  const startTime = Date.now();
  
  // Collect all available API keys from environment
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_SECONDARY,
    process.env.GEMINI_API_KEY_TERTIARY
  ].filter(key => key && key !== 'YOUR_GEMINI_API_KEY_HERE') as string[];

  const runMock = (reason: string) => {
    console.log(`--- MOCK AI MODE: ${reason} ---`);
    const mockPaper = generateMockPaper(assignment);
    return {
      ...mockPaper,
      metadata: {
        modelUsed: 'mock-educational-generator',
        promptTokens: 0,
        generationTimeMs: Date.now() - startTime,
      },
    };
  };

  if (apiKeys.length === 0) {
    return runMock('No GEMINI_API_KEY provided');
  }

  const prompt = PromptBuilder.build(assignment, fileContent);

  // Try each API key
  for (let i = 0; i < apiKeys.length; i++) {
    const currentApiKey = apiKeys[i];
    console.log(`[AI] Trying API Key ${i + 1} of ${apiKeys.length}`);

    // Try each model in the fallback chain for the current key
    for (const modelName of MODEL_FALLBACK_CHAIN) {
      try {
        const { text, modelName: usedModel } = await tryGenerateWithModel(modelName, currentApiKey, prompt);

        const cleanedJsonText = cleanRawResponse(text);
        const parsedObj = JSON.parse(cleanedJsonText);

        // Validate schema with Zod
        const validatedPaper = QuestionPaperZodSchema.parse(parsedObj);

        // Log count mismatches as warnings only — do NOT throw
        for (const config of assignment.questionConfig) {
          let actualCount = 0;
          for (const section of validatedPaper.sections) {
            actualCount += section.questions.filter((q) => q.type === config.type).length;
          }
          if (actualCount !== config.count) {
            console.warn(`[AI] Count mismatch for ${config.type}: requested ${config.count}, got ${actualCount}. Accepting result.`);
          }
        }

        console.log(`[AI] Successfully generated paper with model: ${usedModel} using Key ${i + 1}`);
        return {
          title: validatedPaper.title,
          subject: assignment.subject,
          grade: assignment.grade,
          timeLimit: validatedPaper.timeLimit,
          totalMarks: validatedPaper.totalMarks,
          sections: validatedPaper.sections as Section[],
          metadata: {
            modelUsed: usedModel,
            promptTokens: prompt.length / 4,
            generationTimeMs: Date.now() - startTime,
          },
        };
      } catch (error: any) {
        const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Too Many Requests') || error?.message?.includes('quota');
        const is404 = error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('not found');

        if (is429) {
          console.warn(`[AI] ${modelName} hit rate limit (429) on Key ${i + 1}. Trying next model...`);
          continue; // Move to next model
        }
        if (is404) {
          console.warn(`[AI] ${modelName} not available (404). Trying next model...`);
          continue; // Move to next model
        }

        // For any other error (network, Zod parse, etc.) — re-throw
        console.error(`[AI] Non-quota error with model ${modelName}:`, error);
        throw error;
      }
    }
    
    console.warn(`[AI] Key ${i + 1} exhausted all models. Moving to next API key if available...`);
  }

  // All keys and models failed with quota errors — gracefully use mock
  console.warn('[AI] All Gemini keys and models exhausted their quotas. Falling back to Mock AI generator.');
  return runMock('All Gemini keys hit rate limits — using intelligent mock fallback');
};
