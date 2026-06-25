// FILE: src/hooks/useGeneration.ts

import { useState, useEffect, useRef } from 'react';

export type GenerationState =
  | { phase: 'idle' }
  | { phase: 'queued';      jobId: string }
  | { phase: 'processing';  jobId: string; startedAt: number }
  | { phase: 'done';        jobId: string; outputPath: string; durationMs: number }
  | { phase: 'error';       jobId: string; message: string };

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({ phase: 'idle' });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Submit action: calls POST /api/generate and configures state in 'queued' phase
  async function submit(payload: any): Promise<string> {
    try {
      setState({ phase: 'idle' });
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        const errorMsg = body.error?.message || 'Server returned an invalid generation configuration response';
        setState({ phase: 'error', jobId: '', message: errorMsg });
        throw new Error(errorMsg);
      }

      setState({ phase: 'queued', jobId: body.jobId });
      return body.jobId;

    } catch (err: any) {
      const errorMsg = err.message || 'Network failure during pipeline submission';
      setState({ phase: 'error', jobId: '', message: errorMsg });
      throw err;
    }
  }

  // Polling tracker loop
  useEffect(() => {
    const currentState = state;
    if (currentState.phase !== 'queued' && currentState.phase !== 'processing') {
      return;
    }

    const { jobId } = currentState;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        if (!res.ok) {
          throw new Error(`Server returned status code: ${res.status}`);
        }
        
        const body = await res.json();
        if (!body.success || !body.data) {
          throw new Error(body.error?.message || 'Invalid status query format');
        }

        const data = body.data;
        const currentRefPhase = stateRef.current.phase;

        if (data.status === 'done') {
          clearInterval(interval);
          setState({
            phase: 'done',
            jobId,
            outputPath: data.output_path || '',
            durationMs: data.duration_ms || 0
          });
        } else if (data.status === 'error') {
          clearInterval(interval);
          setState({
            phase: 'error',
            jobId,
            message: data.error_msg || 'Encoding compilation thread failed'
          });
        } else if (data.status === 'processing') {
          if (currentRefPhase !== 'processing') {
            setState({
              phase: 'processing',
              jobId,
              startedAt: Date.now()
            });
          }
        }
      } catch (err: any) {
        // Muted logs fallback
        console.error('Polling tick error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [state]);

  return {
    state,
    submit,
    reset: () => setState({ phase: 'idle' })
  };
}
