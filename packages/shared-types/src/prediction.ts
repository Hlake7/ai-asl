export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export interface LandmarkPayload {
  landmarks: LandmarkPoint[]; // exactly 21 points
  handedness: 'left' | 'right';
  timestamp: number;
}

export interface PredictionAlternative {
  letter: string;
  confidence: number;
}

export interface PredictionResponse {
  letter: string | null; // "A"–"Z", or null when no hand detected or confidence too low
  confidence: number;    // 0.0–1.0
  alternatives: PredictionAlternative[]; // top 3 runner-up predictions
}
