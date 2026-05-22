import { Router } from 'express';
import { upload } from '../middleware/upload';
import { CreateAssignmentSchema } from '../schemas/assignment.schema';
import { AssignmentModel } from '../models/Assignment';
import { questionQueue } from '../queues/queues';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Endpoint to submit an assignment config form, upload optional files,
 * save document draft, and push task to the BullMQ generator queue.
 */
router.post('/', requireAuth, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    let rawPayload = req.body;

    // Support multipart/form-data boundary holding JSON data inside stringified metadata
    if (req.body.metadata) {
      try {
        rawPayload = JSON.parse(req.body.metadata);
      } catch (error) {
        return res.status(400).json({
          status: 'error',
          errors: [{ field: 'metadata', message: 'Failed to parse metadata JSON format' }]
        });
      }
    }

    // Validate the assignment properties using Zod schema
    const validatedAssignment = CreateAssignmentSchema.parse(rawPayload);

    let fileReference;
    if (req.file) {
      fileReference = {
        path: req.file.path,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    // Save Assignment with a starting status of 'draft'
    const assignment = new AssignmentModel({
      ...validatedAssignment,
      fileReference,
      status: 'draft',
      userId: req.user!.id
    });

    await assignment.save();

    // Update state to 'queued' and enqueue background generation job
    assignment.status = 'queued';
    await assignment.save();

    await questionQueue.add(`generate-questions-${assignment._id}`, {
      assignmentId: assignment._id.toString()
    });

    res.status(201).json({
      status: 'success',
      assignmentId: assignment._id
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const inlineErrors = error.errors.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ status: 'error', errors: inlineErrors });
    }
    next(error);
  }
});

/**
 * Fetch individual job/generation status state
 */
router.get('/:id/status', async (req, res, next) => {
  try {
    const assignment = await AssignmentModel.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    res.json({
      status: 'success',
      assignmentId: assignment._id,
      statusState: assignment.status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Fetch all assignments
 */
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const assignments = await AssignmentModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({
      status: 'success',
      assignments
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete an assignment
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const assignment = await AssignmentModel.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!assignment) {
      return res.status(404).json({ status: 'error', message: 'Assignment not found' });
    }
    res.json({ status: 'success', message: 'Assignment deleted' });
  } catch (error) {
    next(error);
  }
});

export const assignmentRouter = router;
