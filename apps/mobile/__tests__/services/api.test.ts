import { predictSign } from '../../src/services/api';
import type { LandmarkPayload, PredictionResponse } from '@asl-app/shared-types';

const MOCK_LANDMARKS = Array.from({ length: 21 }, (_, i) => ({
  x: i * 0.01,
  y: i * 0.02,
  z: i * 0.005,
}));

const MOCK_PAYLOAD: LandmarkPayload = {
  landmarks: MOCK_LANDMARKS,
  handedness: 'right',
  timestamp: 1000,
};

const MOCK_RESPONSE: PredictionResponse = {
  letter: 'A',
  confidence: 0.94,
  alternatives: [{ letter: 'B', confidence: 0.03 }],
};

describe('predictSign', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('POSTs landmarks to /predict and returns PredictionResponse', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RESPONSE,
    });

    const result = await predictSign(MOCK_PAYLOAD);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predict'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(MOCK_PAYLOAD),
      }),
    );
    expect(result).toEqual(MOCK_RESPONSE);
  });

  it('throws when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(predictSign(MOCK_PAYLOAD)).rejects.toThrow('503');
  });
});
