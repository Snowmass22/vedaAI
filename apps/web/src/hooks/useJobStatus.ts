import { useEffect, useRef } from 'react';
import { usePaperStore } from '../store/paperStore';
import { WebSocketServerMessage, WebSocketClientMessage } from '@veda-ai/types';

/**
 * Custom hook to open WebSocket links to the backend server, subscribe
 * to a specific generation room, and pipe progress events into the Zustand store.
 * Also runs an HTTP polling fallback every 4s to recover from missed WS events.
 */
export const useJobStatus = (assignmentId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    status,
    progress,
    message,
    paperId,
    error,
    updateStatus,
    setError,
    setPaperId,
    addLog
  } = usePaperStore();

  useEffect(() => {
    if (!assignmentId) return;

    const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const rawWsHost = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

    // ── HTTP Polling Fallback ────────────────────────────────────────────────
    // Runs every 4s as a safety net. Catches the case where WS events were
    // missed because the job started before the browser subscribed.
    pollIntervalRef.current = setInterval(async () => {
      const currentState = usePaperStore.getState();
      if (currentState.status === 'completed' || currentState.status === 'failed') {
        clearInterval(pollIntervalRef.current!);
        return;
      }

      try {
        const res = await fetch(`${apiHost}/api/assignments/${assignmentId}/status`);
        const data = await res.json();

        if (data.statusState === 'completed') {
          // WS missed the completion event — fetch paper ID via HTTP
          const paperRes = await fetch(`${apiHost}/api/papers/assignment/${assignmentId}`);
          const paperData = await paperRes.json();
          if (paperData.status === 'success' && paperData.paper?._id) {
            clearInterval(pollIntervalRef.current!);
            setPaperId(paperData.paper._id);
            updateStatus('completed', 100, 'Assessment paper compiled successfully!');
            addLog('Paper generation completed (recovered via HTTP poll).');
          }
        } else if (data.statusState === 'failed') {
          clearInterval(pollIntervalRef.current!);
          setError('Generation failed. Please retry.');
          updateStatus('failed', 0, 'Generation failed.');
        } else if (data.statusState === 'processing') {
          // Show minimal progress so the UI never freezes at 0%
          if (currentState.progress < 10) {
            updateStatus('processing', 15, 'Processing assignment in queue...');
          }
        }
      } catch {
        // Silently ignore polling network errors — WebSocket is primary
      }
    }, 4000);

    // ── WebSocket Primary Connection ─────────────────────────────────────────
    const connectSocket = () => {
      const wsUrl = `${rawWsHost}/ws`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      addLog('Connecting to real-time assessment server...');

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket successfully established.');
        addLog('Real-time channel connected successfully.');
        reconnectAttempt.current = 0;

        const subscribePayload: WebSocketClientMessage = {
          type: 'subscribe',
          assignmentId
        };
        ws.send(JSON.stringify(subscribePayload));
        updateStatus('queued', 5, 'Waiting in generation queue...');
      };

      ws.onmessage = (event) => {
        try {
          const payload: WebSocketServerMessage = JSON.parse(event.data);
          console.log('Received socket packet:', payload);

          if (payload.type === 'progress') {
            updateStatus('processing', payload.progress, payload.message);
            addLog(payload.message);
          } else if (payload.type === 'completed') {
            clearInterval(pollIntervalRef.current!);
            setPaperId(payload.paperId);
            updateStatus('completed', 100, 'Assessment paper compiled successfully!');
          } else if (payload.type === 'failed') {
            clearInterval(pollIntervalRef.current!);
            setError(payload.error);
            updateStatus('failed', 0, `Generation failed: ${payload.error}`);
          }
        } catch (err) {
          console.error('Failed to parse incoming WebSocket message stream:', err);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected. Event Code: ${event.code}`);

        const currentStoreState = usePaperStore.getState().status;
        if (currentStoreState !== 'completed' && currentStoreState !== 'failed') {
          addLog('Network connection disrupted. Reconnecting...');

          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 16000);
          console.log(`Attempting WebSocket reconnection in ${backoffDelay}ms...`);

          reconnectAttempt.current += 1;
          reconnectTimeout.current = setTimeout(() => {
            connectSocket();
          }, backoffDelay);
        }
      };

      ws.onerror = () => {
        // onerror fires before onclose — browser auto-closes the socket after an error.
        // Calling ws.close() here causes a double onclose → double reconnect loop.
        // Simply log a warning; onclose will handle reconnection.
        console.warn('[WS] Connection error — server may be restarting. Reconnect scheduled.');
      };
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [assignmentId, updateStatus, setError, setPaperId, addLog]);

  return { status, progress, message, paperId, error };
};
