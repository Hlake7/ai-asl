import type { LandmarkPayload, PredictionResponse } from '@asl-app/shared-types';

/**
 * Base URL for the inference API.
 * In development this points to the local Docker container.
 * Override with EXPO_PUBLIC_API_URL env variable.
 */
export const API_BASE_URL =
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:8000';

/**
 * POST 21 landmarks to /predict and return the model's classification.
 * Throws if the response is not 2xx.
 */
export async function predictSign(
  payload: LandmarkPayload,
): Promise<PredictionResponse> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Predict failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PredictionResponse>;
}
