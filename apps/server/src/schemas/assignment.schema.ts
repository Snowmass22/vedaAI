import { z } from 'zod';

const QuestionConfigInputSchema = z.object({
  type: z.enum(['mcq', 'short', 'long', 'true_false'], {
    required_error: 'Question type is required'
  }),
  count: z.number().int().positive('Question count must be at least 1').max(100, 'Maximum questions allowed is 100'),
  marks: z.number().int().positive('Marks per question must be at least 1').max(100, 'Maximum marks per question is 100'),
  difficulty: z.enum(['easy', 'moderate', 'hard', 'mixed'], {
    required_error: 'Difficulty level is required'
  })
});

export const CreateAssignmentSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  grade: z.string().min(1, 'Grade or Class is required'),
  topic: z.string().min(3, 'Topic must be at least 3 characters'),
  dueDate: z.string().refine((val) => {
    const parsedDate = Date.parse(val);
    return !isNaN(parsedDate) && parsedDate > Date.now();
  }, {
    message: 'Due date must be a valid future date'
  }),
  questionConfig: z.array(QuestionConfigInputSchema).min(1, 'At least one question type configuration must be provided'),
  additionalInstructions: z.string().optional()
});

export const UpdatePaperQuestionSchema = z.object({
  sectionIndex: z.number().int().nonnegative(),
  questionIndex: z.number().int().nonnegative(),
  text: z.string().min(1, 'Question text cannot be empty'),
  marks: z.number().int().positive('Question marks must be at least 1'),
  difficulty: z.enum(['easy', 'moderate', 'hard'])
});
