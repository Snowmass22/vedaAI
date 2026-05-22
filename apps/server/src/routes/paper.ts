import { Router } from 'express';
import { QuestionPaperModel } from '../models/QuestionPaper';
import { pdfQueue } from '../queues/queues';

const router = Router();

/**
 * Fetch a generated question paper using its associated assignment ID.
 */
router.get('/assignment/:assignmentId', async (req, res, next) => {
  try {
    const paper = await QuestionPaperModel.findOne({ assignmentId: req.params.assignmentId });
    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: 'No question paper found for this assignment ID'
      });
    }

    res.json({
      status: 'success',
      paper
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Fetch a question paper by its document ID.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const paper = await QuestionPaperModel.findById(req.params.id);
    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: 'Question paper not found'
      });
    }

    res.json({
      status: 'success',
      paper
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update exam details or questions inline, automatically recalculating total aggregate marks.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const paperId = req.params.id;
    const { title, sections, timeLimit } = req.body;

    const paper = await QuestionPaperModel.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: 'Question paper not found'
      });
    }

    if (title) paper.title = title;
    if (timeLimit !== undefined) paper.timeLimit = timeLimit;
    if (sections) {
      paper.sections = sections;
      
      // Auto-recalculate aggregate exam marks sum
      let sumMarks = 0;
      for (const section of sections) {
        for (const question of section.questions) {
          sumMarks += question.marks;
        }
      }
      paper.totalMarks = sumMarks;
    }

    await paper.save();

    res.json({
      status: 'success',
      paper
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Request Puppeteer PDF export generation (adds job to BullMQ queue).
 */
router.post('/:id/export', async (req, res, next) => {
  try {
    const paperId = req.params.id;
    const paper = await QuestionPaperModel.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        status: 'error',
        message: 'Question paper not found'
      });
    }

    // Push PDF task
    const job = await pdfQueue.add(`generate-pdf-${paperId}`, {
      paperId
    });

    res.json({
      status: 'success',
      jobId: job.id
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Poll state of PDF generation queue tasks.
 */
router.get('/:id/export/status/:jobId', async (req, res, next) => {
  try {
    const jobId = req.params.jobId;
    const job = await pdfQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'PDF generation job not found'
      });
    }

    const state = await job.getState();
    const result = job.returnvalue;

    res.json({
      status: 'success',
      jobStatus: state, // 'completed' | 'failed' | 'active' | 'waiting'
      downloadUrl: result?.downloadUrl || null
    });
  } catch (error) {
    next(error);
  }
});

export const paperRouter = router;
