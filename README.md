# VedaAI: AI-Powered Assessment Creator

frontend link: https://vedaai-frontend-4px2.onrender.com/
backend link: https://vedaai-9td1.onrender.com/

VedaAI is an innovative platform designed to help educators generate customized examination papers with ease. Leveraging the power of Google Gemini, it can create structured question papers, including multiple-choice, short-answer, long-answer, and true/false questions, complete with marking schemes. Users can also upload their own study materials (PDFs, text files) to provide context for question generation.

## Architecture Overview

VedaAI employs a modern, scalable architecture built around a monorepo structure, separating concerns into distinct applications and shared packages.

*   **Frontend (`apps/web`):** Developed with Next.js, providing a dynamic and responsive user interface for creating, managing, and reviewing assessment papers.
*   **Backend (`apps/server`):** A Node.js/Express application serving as the API layer. It handles user authentication, assignment management, AI integration, and real-time communication.
*   **Shared Packages (`@veda-ai/types`, `@veda-ai/config`):** These packages facilitate code sharing and consistency across the monorepo, defining common types and configurations.
*   **Database (MongoDB):** Used for persistent storage of assignments, generated question papers, user data, and chat messages.
*   **Caching & Task Queue (Redis):** Utilized for real-time data caching and as a message broker for BullMQ, managing background jobs.
*   **AI Integration (Google Gemini API):** The core intelligence behind question generation. The backend interacts with Gemini models to draft questions based on user input and provided context.
*   **Real-time Communication (WebSockets):** Powers live updates for job progress and chat functionalities, ensuring a responsive user experience.
*   **Task Queues (BullMQ):** Manages asynchronous operations like AI question generation and PDF export, preventing blocking operations on the main API thread.
*   **File Storage:** Handles the upload and temporary storage of user-provided context files.

## Approach

VedaAI's approach to assessment generation is designed for robustness, flexibility, and a seamless user experience:

1.  **Assignment Submission:**
    *   Users define assignment parameters (subject, grade, topic, question types, counts, difficulty).
    *   Optional: Users can upload context files (PDFs, text) to guide the AI.
    *   The backend validates the input using Zod schemas and saves the assignment as a `draft`.
    *   The assignment status is updated to `queued`, and a background job is added to a BullMQ queue.

2.  **Background Question Generation (Worker Process):**
    *   A dedicated worker process (powered by BullMQ and Redis) picks up the queued assignment.
    *   **Context Ingestion:** If a context file was uploaded, the worker extracts its text content (e.g., using `pdf-parse` for PDFs).
    *   **AI Prompting:** The `PromptBuilder` service constructs a detailed prompt for the Google Gemini API, incorporating assignment details and extracted context.
    *   **Resilient AI Call:** The system attempts to generate questions using a fallback chain of Gemini models and multiple API keys to maximize success rates and handle rate limits.
    *   **Response Validation:** The AI's JSON output is cleaned and rigorously validated against Zod schemas to ensure structural integrity.
    *   **Mock Fallback:** In cases of complete AI failure or unavailable API keys, an intelligent mock generator provides an educational placeholder paper.
    *   **Progress Tracking:** Real-time progress updates are broadcast to the frontend via WebSockets, keeping the user informed.
    *   **Database Storage:** The generated `QuestionPaper` is saved to MongoDB, linked to the original assignment.
    *   The assignment status is updated to `completed` or `failed` based on the outcome.

3.  **Frontend Interaction & Editing:**
    *   The `GeneratingPage` component displays live progress and logs from the backend worker via WebSockets.
    *   Upon completion, the user is redirected to the `PaperPage`.
    *   The `PaperPage` allows educators to review and edit the generated paper:
        *   Modify question text.
        *   Reorder questions within or between sections using drag-and-drop.
        *   Add new manual questions.
        *   Delete questions.
        *   Toggle the visibility of the marking scheme.
    *   Changes are saved back to the backend.

4.  **PDF Export:**
    *   Users can export the final question paper as a PDF.
    *   This triggers another background job, and the frontend polls for its completion, then initiates the download.

5.  **Authentication & Authorization:**
    *   The system uses JWT (JSON Web Tokens) for secure user authentication and authorization across API endpoints and WebSocket connections.

This comprehensive approach ensures that VedaAI delivers a reliable, feature-rich, and user-friendly experience for creating high-quality assessment papers.
```
<!--
[PROMPT_SUGGESTION]Explain how to set up the development environment for this project, including Docker and Node.js dependencies.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Provide instructions on how to deploy this application to a cloud provider like Google Cloud Platform or AWS.[/PROMPT_SUGGESTION]
