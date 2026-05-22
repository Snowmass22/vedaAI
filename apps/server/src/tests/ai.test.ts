import { PromptBuilder } from '../services/prompt';
import { Assignment } from '@veda-ai/types';

describe('PromptBuilder', () => {
  it('should construct system prompts matching subject, class levels, and topic guidelines', () => {
    const assignment: Assignment = {
      subject: 'Chemistry',
      grade: 'Class 10',
      topic: 'Acids and Bases',
      dueDate: new Date().toISOString(),
      questionConfig: [
        { type: 'mcq', count: 5, marks: 1, difficulty: 'easy' }
      ],
      status: 'draft'
    };

    const prompt = PromptBuilder.build(assignment);
    
    expect(prompt).toContain('Chemistry');
    expect(prompt).toContain('Class 10');
    expect(prompt).toContain('Acids and Bases');
    expect(prompt).toContain('MCQ');
    expect(prompt).toContain('Return ONLY valid JSON');
  });

  it('should inject context files under designated sections', () => {
    const assignment: Assignment = {
      subject: 'Physics',
      grade: 'Class 11',
      topic: 'Gravitation',
      dueDate: new Date().toISOString(),
      questionConfig: [
        { type: 'short', count: 2, marks: 3, difficulty: 'moderate' }
      ],
      status: 'draft'
    };

    const extractedContextText = 'Isaac Newton formulated the universal law of gravitation in Principia Mathematica.';
    const prompt = PromptBuilder.build(assignment, extractedContextText);

    expect(prompt).toContain('Source Context Material');
    expect(prompt).toContain('Isaac Newton formulated the universal law of gravitation');
  });
});
// Simple Jest runner placeholder config can run this unit test
