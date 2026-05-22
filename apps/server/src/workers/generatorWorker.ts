import { Worker, Job } from 'bullmq';
import fs from 'fs';
import { getRedisConnection } from '../config/redis';
import { AssignmentModel } from '../models/Assignment';
import { QuestionPaperModel } from '../models/QuestionPaper';
import { generateQuestionPaper } from '../services/ai';
import { broadcastToRoom } from '../services/websocket';
import { Assignment } from '@veda-ai/types';
import pdfParse from 'pdf-parse';

const connection = getRedisConnection();

export const initQuestionWorker = () => {
  const worker = new Worker(
    'question-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`Processing BullMQ job ${job.id} for assignment ID: ${assignmentId}`);

      try {
        // Allow frontend WebSocket to connect and subscribe before broadcasting
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Milestone 1: Fetching assignment details
        broadcastToRoom(assignmentId, { 
          type: 'progress', 
          progress: 10, 
          message: 'Fetching assignment configurations...' 
        });

        const assignment = await AssignmentModel.findById(assignmentId);
        if (!assignment) {
          throw new Error(`Assignment document for ID ${assignmentId} not found.`);
        }

        assignment.status = 'processing';
        await assignment.save();

        // Milestone 2: Document Context Ingestion (if present)
        let contextText = '';
        if (assignment.fileReference) {
          broadcastToRoom(assignmentId, { 
            type: 'progress', 
            progress: 25, 
            message: `Ingesting context document: ${assignment.fileReference.filename}...` 
          });

          const filePath = assignment.fileReference.path;
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);

            if (assignment.fileReference.mimeType === 'application/pdf') {
              console.log('Extracting text content from PDF file...');
              const parsedPdf = await pdfParse(fileBuffer);
              contextText = parsedPdf.text;
            } else {
              contextText = fileBuffer.toString('utf-8');
            }
            console.log(`Extracted context containing ${contextText.length} characters.`);
          } else {
            console.warn(`Source file not found at: ${filePath}`);
          }
        }

        // Milestone 3: Calling LLM pipeline
        broadcastToRoom(assignmentId, { 
          type: 'progress', 
          progress: 50, 
          message: 'Generating structured sections and questions via AI...' 
        });

        const assignmentData: Assignment = {
          ...assignment.toObject(),
          _id: assignment._id.toString()
        };
        const generatedPaper = await generateQuestionPaper(assignmentData, contextText);

        // Milestone 4: Structure validation and MongoDB storage
        broadcastToRoom(assignmentId, { 
          type: 'progress', 
          progress: 85, 
          message: 'Validating layout integrity and committing to database...' 
        });

        const savedPaper = await QuestionPaperModel.create({
          ...generatedPaper,
          assignmentId: assignment._id
        });

        // Milestone 5: Job completion state updates
        assignment.status = 'completed';
        await assignment.save();

        broadcastToRoom(assignmentId, { 
          type: 'progress', 
          progress: 100, 
          message: 'Examination paper generated successfully!' 
        });

        broadcastToRoom(assignmentId, { 
          type: 'completed', 
          paperId: savedPaper._id.toString() 
        });

        console.log(`BullMQ job ${job.id} completed successfully. Saved Paper ID: ${savedPaper._id}`);
      } catch (error: any) {
        console.error(`BullMQ worker error on job ${job.id}:`, error);

        // Mark assignment database status as failed
        await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'failed' });

        broadcastToRoom(assignmentId, { 
          type: 'failed', 
          error: error.message || 'Fatal generation error inside workers' 
        });

        throw error; // Let BullMQ trigger retry delays
      }
    },
    { connection }
  );

  worker.on('failed', (job, error) => {
    console.error(`BullMQ Question generation worker failed on job ${job?.id}:`, error);
  });

  return worker;
};
