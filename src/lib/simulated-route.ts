export interface SimulatedPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // m/s
  accuracy: number; // meters
}

/**
 * ~60 GPS points tracing a realistic 3 km loop around Cubbon Park, Bangalore.
 *
 * Route:
 *   Start at the south gate area (12.9762, 77.5929)
 *   → north along Kasturba Road inner edge
 *   → east along the park's north boundary
 *   → south-east curve toward MG Road end
 *   → west back to start
 *
 * Each consecutive pair is ~50 m apart.
 * Altitude varies 920–925 m (Bangalore plateau).
 * Speed varies 2.5–3.5 m/s (typical easy run).
 * Accuracy 5–12 m (good urban GPS).
 */
export const SIMULATED_ROUTE: SimulatedPoint[] = [
  // ── Leg 1: south gate → heading north-west along Kasturba Rd ───────────
  { latitude: 12.9762, longitude: 77.5929, altitude: 921.0, speed: 2.8, accuracy: 8 },
  { latitude: 12.9766, longitude: 77.5925, altitude: 921.2, speed: 2.9, accuracy: 7 },
  { latitude: 12.9770, longitude: 77.5921, altitude: 921.4, speed: 3.0, accuracy: 6 },
  { latitude: 12.9774, longitude: 77.5917, altitude: 921.5, speed: 3.1, accuracy: 7 },
  { latitude: 12.9778, longitude: 77.5913, altitude: 921.6, speed: 3.2, accuracy: 8 },
  { latitude: 12.9782, longitude: 77.5909, altitude: 921.7, speed: 3.0, accuracy: 7 },
  { latitude: 12.9786, longitude: 77.5905, altitude: 921.8, speed: 2.9, accuracy: 6 },
  { latitude: 12.9790, longitude: 77.5901, altitude: 921.9, speed: 2.8, accuracy: 7 },
  { latitude: 12.9794, longitude: 77.5897, altitude: 922.0, speed: 3.0, accuracy: 8 },
  { latitude: 12.9798, longitude: 77.5893, altitude: 922.1, speed: 3.1, accuracy: 7 },

  // ── Leg 2: turn north, running up the west side of the park ────────────
  { latitude: 12.9802, longitude: 77.5891, altitude: 922.2, speed: 3.2, accuracy: 6 },
  { latitude: 12.9806, longitude: 77.5889, altitude: 922.3, speed: 3.3, accuracy: 7 },
  { latitude: 12.9810, longitude: 77.5887, altitude: 922.4, speed: 3.2, accuracy: 8 },
  { latitude: 12.9814, longitude: 77.5885, altitude: 922.5, speed: 3.1, accuracy: 7 },
  { latitude: 12.9818, longitude: 77.5883, altitude: 922.6, speed: 3.0, accuracy: 6 },
  { latitude: 12.9822, longitude: 77.5882, altitude: 922.7, speed: 2.9, accuracy: 7 },
  { latitude: 12.9826, longitude: 77.5881, altitude: 922.8, speed: 2.8, accuracy: 9 },
  { latitude: 12.9830, longitude: 77.5880, altitude: 922.9, speed: 2.7, accuracy: 10 },
  { latitude: 12.9834, longitude: 77.5879, altitude: 923.0, speed: 2.8, accuracy: 9 },
  { latitude: 12.9838, longitude: 77.5878, altitude: 923.1, speed: 2.9, accuracy: 8 },

  // ── Leg 3: north boundary, heading east ────────────────────────────────
  { latitude: 12.9841, longitude: 77.5882, altitude: 923.2, speed: 3.0, accuracy: 7 },
  { latitude: 12.9843, longitude: 77.5887, altitude: 923.3, speed: 3.1, accuracy: 6 },
  { latitude: 12.9844, longitude: 77.5892, altitude: 923.3, speed: 3.2, accuracy: 7 },
  { latitude: 12.9845, longitude: 77.5897, altitude: 923.2, speed: 3.3, accuracy: 8 },
  { latitude: 12.9846, longitude: 77.5902, altitude: 923.1, speed: 3.4, accuracy: 7 },
  { latitude: 12.9847, longitude: 77.5907, altitude: 923.0, speed: 3.5, accuracy: 6 },
  { latitude: 12.9848, longitude: 77.5912, altitude: 922.9, speed: 3.4, accuracy: 7 },
  { latitude: 12.9849, longitude: 77.5917, altitude: 922.8, speed: 3.3, accuracy: 8 },
  { latitude: 12.9850, longitude: 77.5922, altitude: 922.7, speed: 3.2, accuracy: 7 },
  { latitude: 12.9851, longitude: 77.5927, altitude: 922.6, speed: 3.1, accuracy: 6 },

  // ── Leg 4: north-east corner, turning south-east ────────────────────────
  { latitude: 12.9851, longitude: 77.5932, altitude: 922.5, speed: 3.0, accuracy: 7 },
  { latitude: 12.9850, longitude: 77.5937, altitude: 922.5, speed: 2.9, accuracy: 8 },
  { latitude: 12.9848, longitude: 77.5941, altitude: 922.4, speed: 2.8, accuracy: 9 },
  { latitude: 12.9845, longitude: 77.5945, altitude: 922.4, speed: 2.8, accuracy: 10 },
  { latitude: 12.9842, longitude: 77.5948, altitude: 922.3, speed: 2.9, accuracy: 9 },
  { latitude: 12.9839, longitude: 77.5951, altitude: 922.2, speed: 3.0, accuracy: 8 },
  { latitude: 12.9836, longitude: 77.5953, altitude: 922.1, speed: 3.1, accuracy: 7 },
  { latitude: 12.9833, longitude: 77.5955, altitude: 922.0, speed: 3.2, accuracy: 6 },
  { latitude: 12.9830, longitude: 77.5957, altitude: 921.9, speed: 3.1, accuracy: 7 },
  { latitude: 12.9827, longitude: 77.5958, altitude: 921.8, speed: 3.0, accuracy: 8 },

  // ── Leg 5: east side, heading south ────────────────────────────────────
  { latitude: 12.9823, longitude: 77.5957, altitude: 921.7, speed: 2.9, accuracy: 7 },
  { latitude: 12.9819, longitude: 77.5956, altitude: 921.7, speed: 2.8, accuracy: 8 },
  { latitude: 12.9815, longitude: 77.5955, altitude: 921.6, speed: 2.8, accuracy: 9 },
  { latitude: 12.9811, longitude: 77.5954, altitude: 921.5, speed: 2.9, accuracy: 8 },
  { latitude: 12.9807, longitude: 77.5953, altitude: 921.4, speed: 3.0, accuracy: 7 },
  { latitude: 12.9803, longitude: 77.5952, altitude: 921.3, speed: 3.1, accuracy: 6 },
  { latitude: 12.9799, longitude: 77.5950, altitude: 921.3, speed: 3.0, accuracy: 7 },
  { latitude: 12.9795, longitude: 77.5948, altitude: 921.2, speed: 2.9, accuracy: 8 },
  { latitude: 12.9791, longitude: 77.5946, altitude: 921.2, speed: 2.8, accuracy: 9 },
  { latitude: 12.9787, longitude: 77.5943, altitude: 921.1, speed: 2.7, accuracy: 10 },

  // ── Leg 6: south-east corner, turning west back toward start ────────────
  { latitude: 12.9783, longitude: 77.5940, altitude: 921.0, speed: 2.8, accuracy: 9 },
  { latitude: 12.9780, longitude: 77.5937, altitude: 920.9, speed: 2.9, accuracy: 8 },
  { latitude: 12.9778, longitude: 77.5933, altitude: 920.9, speed: 3.0, accuracy: 7 },
  { latitude: 12.9776, longitude: 77.5929, altitude: 920.8, speed: 3.1, accuracy: 6 },
  { latitude: 12.9774, longitude: 77.5925, altitude: 920.8, speed: 3.1, accuracy: 7 },
  { latitude: 12.9772, longitude: 77.5921, altitude: 920.7, speed: 3.0, accuracy: 8 },
  { latitude: 12.9770, longitude: 77.5917, altitude: 920.7, speed: 2.9, accuracy: 7 },
  { latitude: 12.9768, longitude: 77.5913, altitude: 920.6, speed: 2.9, accuracy: 8 },

  // ── Final approach back to start ─────────────────────────────────────────
  { latitude: 12.9766, longitude: 77.5930, altitude: 920.5, speed: 2.8, accuracy: 9 },
  { latitude: 12.9764, longitude: 77.5929, altitude: 920.4, speed: 2.7, accuracy: 10 },
  { latitude: 12.9762, longitude: 77.5929, altitude: 920.3, speed: 2.5, accuracy: 11 },
];
