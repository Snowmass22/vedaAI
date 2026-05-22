import { Assignment } from '@veda-ai/types';

export class PromptBuilder {
  /**
   * Translates assignment configuration models into high-quality educational prompts
   * with strict instructions for JSON-structured responses.
   */
  static build(assignment: Assignment, fileContent?: string): string {
    const configsText = assignment.questionConfig
      .map(
        (c) =>
          `- **${c.type.toUpperCase()}**: ${c.count} questions, ${c.marks} marks each, Difficulty: ${c.difficulty}`
      )
      .join('\n');

    let prompt = `You are an expert educator creating a formal examination paper for standard school or college class levels.

Create a complete, highly professional, and challenging examination paper matching the requirements below:

### Course & Student Details
- **Subject**: ${assignment.subject}
- **Grade/Class**: ${assignment.grade}
- **Assessment Topic**: ${assignment.topic}
- **Total Duration**: Generously calculate a recommended duration in minutes matching this exam complexity.

### Structure & Questions Configuration
Generate the exact question counts and configurations:
${configsText}

### Exam Layout Sections Rule:
Organize the questions cleanly into logical Sections (e.g., Section A, Section B, Section C, etc.).
- Group questions by type: Section A should hold MCQs, Section B holds Short Answers, Section C holds Long Answers (or similar logical arrangement).
- Each section MUST contain a clear **title** (e.g., "SECTION A: Multiple Choice Questions") and a concise **instruction** (e.g., "Attempt all questions. Each question carries 1 mark.").
- For all Multiple Choice Questions (MCQs), you MUST supply exactly 4 options inside the options array.
- For all True/False questions, you MUST supply exactly 2 options: ["True", "False"].
- For EVERY question, you MUST supply a helpful grading sample answer or rubric guidelines in "sampleAnswer" for the grading sheet key.
- Provide a realistic difficulty level ('easy', 'moderate', or 'hard') matching the requested distribution.

`;

    if (fileContent && fileContent.trim().length > 0) {
      prompt += `### Source Context Material
Base your questions strictly on the following content extracted from the provided text material. Ensure high educational relevance and contextual correctness:
---
${fileContent}
---

`;
    }

    if (assignment.additionalInstructions && assignment.additionalInstructions.trim().length > 0) {
      prompt += `### Teacher Additional Instructions
Incorporate the following custom parameters specified by the teacher:
> ${assignment.additionalInstructions}

`;
    }

    // Append JSON constraints
    prompt += `### Strict Output Format Rules:
Return a single JSON object matching the schema below.
DO NOT wrap the response in markdown blocks. DO NOT provide markdown fences (like \`\`\`json). DO NOT write explanations. DO NOT write preamble text. Return ONLY valid, parseable JSON text.

JSON Schema format:
{
  "title": "Strict Title of the Exam (e.g., Midterm Assessment for Class 10 Chemistry)",
  "timeLimit": 45, // Recommended time in minutes as a number
  "totalMarks": 30, // Total score aggregate sum matching requested counts * marks
  "sections": [
    {
      "title": "SECTION A: Multiple Choice Questions",
      "instruction": "Attempt all questions. Each carries 1 mark.",
      "questions": [
        {
          "id": "q-1", // incremental unique identifier string
          "text": "Question text here?",
          "type": "mcq", // must match: 'mcq' | 'short' | 'long' | 'true_false'
          "options": ["Option A", "Option B", "Option C", "Option D"], // required for mcq and true_false
          "difficulty": "easy", // must match: 'easy' | 'moderate' | 'hard'
          "marks": 1, // must match configuration
          "section": "Section A",
          "sampleAnswer": "Correct option and brief rationale" // teacher answer rubric key
        }
      ]
    }
  ]
}`;

    return prompt;
  }
}
