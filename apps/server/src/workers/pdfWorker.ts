import { Worker, Job } from 'bullmq';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { getRedisConnection } from '../config/redis';
import { QuestionPaperModel } from '../models/QuestionPaper';

const connection = getRedisConnection();

// Ensure public/pdfs directory exists
const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

export const initPdfWorker = () => {
  const worker = new Worker(
    'pdf-generation',
    async (job: Job) => {
      const { paperId } = job.data;
      console.log(`Processing BullMQ PDF generation job ${job.id} for Paper ID: ${paperId}`);

      try {
        const paper = await QuestionPaperModel.findById(paperId);
        if (!paper) {
          throw new Error(`Question paper ${paperId} not found in database.`);
        }

        const frontendHost = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const renderUrl = `${frontendHost}/assignments/${paper.assignmentId}/paper?print=true`;

        console.log(`Launching headless Puppeteer to capture: ${renderUrl}`);
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Wait for network to be idle to guarantee full Next.js page hydrate
        await page.goto(renderUrl, { waitUntil: 'networkidle0' });

        const pdfPath = path.join(pdfDir, `${paperId}.pdf`);
        console.log(`Saving generated PDF binary file to: ${pdfPath}`);

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm'
          }
        });

        fs.writeFileSync(pdfPath, pdfBuffer);
        await browser.close();

        // Path accessible through backend express static serving
        const downloadUrl = `/static/pdfs/${paperId}.pdf`;
        console.log(`Successfully completed PDF job ${job.id}. Output URL: ${downloadUrl}`);

        return { downloadUrl };
      } catch (error) {
        console.error(`BullMQ PDF worker error on job ${job.id}:`, error);
        throw error;
      }
    },
    { connection }
  );

  return worker;
};
