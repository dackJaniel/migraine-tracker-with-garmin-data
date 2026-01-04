/**
 * Garmin API Mock Server
 * Simuliert die Garmin Connect API für Testing
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { 
  generateGarminDataForDate,
  generateCorruptedGarminDay,
  generateIncompleteGarminDay 
} from '../generators/garmin-generator.js';

export interface MockServerConfig {
  port?: number;
  latency?: number; // Simulierte Latenz in ms
  errorRate?: number; // Fehlerrate 0-1
  requireAuth?: boolean;
}

export class GarminApiMockServer {
  private app: Express;
  private server: any;
  private config: Required<MockServerConfig>;
  private sessionTokens: Set<string> = new Set();

  constructor(config: MockServerConfig = {}) {
    this.config = {
      port: config.port || 3001,
      latency: config.latency || 100,
      errorRate: config.errorRate || 0,
      requireAuth: config.requireAuth !== false,
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    // Logging Middleware
    this.app.use((req, _res, next) => {
      console.log(`[Mock API] ${req.method} ${req.path}`);
      next();
    });

    // Simulated Latency
    this.app.use((_req, _res, next) => {
      setTimeout(next, this.config.latency);
    });

    // Auth Check Middleware
    if (this.config.requireAuth) {
      this.app.use((req, res, next) => {
        // Exclude auth endpoints
        if (req.path.includes('/auth') || req.path === '/') {
          return next();
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token || !this.sessionTokens.has(token)) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token',
          });
        }

        next();
      });
    }

    // Random Error Injection
    this.app.use((req, res, next) => {
      if (this.config.errorRate > 0 && Math.random() < this.config.errorRate) {
        const errors = [
          { status: 500, message: 'Internal Server Error' },
          { status: 503, message: 'Service Unavailable' },
          { status: 429, message: 'Too Many Requests' },
        ];
        const error = errors[Math.floor(Math.random() * errors.length)];
        return res.status(error.status).json({ error: error.message });
      }
      next();
    });
  }

  private setupRoutes() {
    // Health Check
    this.app.get('/', (_req, res) => {
      res.json({
        status: 'ok',
        message: 'Garmin API Mock Server',
        version: '1.0.0',
      });
    });

    // Auth Endpoints
    this.setupAuthRoutes();

    // Wellness Service Endpoints
    this.setupWellnessRoutes();

    // HRV Service
    this.setupHRVRoutes();

    // User Summary Service
    this.setupUserSummaryRoutes();

    // 404 Handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  private setupAuthRoutes() {
    // Login (SSO)
    this.app.post('/auth/login', (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Mock validation
      if (password === 'wrong') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate mock token
      const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.sessionTokens.add(token);

      res.json({
        oauth1_token: token,
        oauth2_token: token,
        displayName: email.split('@')[0],
        fullName: 'Mock User',
      });
    });

    // Logout
    this.app.post('/auth/logout', (req, res) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        this.sessionTokens.delete(token);
      }
      res.json({ success: true });
    });

    // Token Refresh
    this.app.post('/auth/refresh', (req, res) => {
      const oldToken = req.headers.authorization?.replace('Bearer ', '');
      if (oldToken && this.sessionTokens.has(oldToken)) {
        this.sessionTokens.delete(oldToken);
        const newToken = `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        this.sessionTokens.add(newToken);

        return res.json({
          oauth1_token: newToken,
          oauth2_token: newToken,
        });
      }

      res.status(401).json({ error: 'Invalid token' });
    });
  }

  private setupWellnessRoutes() {
    const router = express.Router();

    // Sleep Data
    router.get('/dailySleepData/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        dailySleepDTO: {
          sleepTimeSeconds: (garminData.sleepStages!.deep + garminData.sleepStages!.light + garminData.sleepStages!.rem + garminData.sleepStages!.awake) * 60,
          deepSleepSeconds: garminData.sleepStages!.deep * 60,
          lightSleepSeconds: garminData.sleepStages!.light * 60,
          remSleepSeconds: garminData.sleepStages!.rem * 60,
          awakeSleepSeconds: garminData.sleepStages!.awake * 60,
        },
        sleepScores: {
          overall: garminData.sleepScore,
        },
      });
    });

    // Stress Data
    router.get('/dailyStress/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        avgStressLevel: garminData.stressLevel?.average,
        maxStressLevel: garminData.stressLevel?.max,
        stressValuesArray: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(date.getTime() + i * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 40) + 30,
        })),
      });
    });

    // Heart Rate
    router.get('/dailyHeartRate/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        restingHeartRate: garminData.restingHR,
        maxHeartRate: garminData.maxHR,
        heartRateValues: Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(date.getTime() + i * 60 * 60 * 1000).toISOString(),
          value: Math.floor(Math.random() * 50) + 60,
        })),
      });
    });

    // Body Battery
    router.get('/bodyBattery/reports/daily', (req, res) => {
      const { startDate, endDate } = req.query;
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      const data = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const garminData = generateGarminDataForDate(new Date(d));
        data.push({
          date: d.toISOString().split('T')[0],
          charged: garminData.bodyBattery?.charged,
          drained: garminData.bodyBattery?.drained,
          currentValue: garminData.bodyBattery?.current,
        });
      }

      res.json(data);
    });

    // Steps
    router.get('/dailySummaryChart/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        totalSteps: garminData.steps,
        stepGoal: 10000,
        totalDistance: garminData.steps! * 0.0008, // km
      });
    });

    // Respiration
    router.get('/daily/respiration/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        avgSleepRespiration: garminData.respirationRate,
        avgWakingRespiration: garminData.respirationRate! + 2,
      });
    });

    this.app.use('/wellness-service/wellness', router);
  }

  private setupHRVRoutes() {
    this.app.get('/hrv-service/hrv/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        hrvStatus: garminData.hrv! > 50 ? 'BALANCED' : 'LOW',
        lastNightAvg: garminData.hrv,
        weeklyAvg: garminData.hrv! + Math.floor(Math.random() * 10) - 5,
      });
    });
  }

  private setupUserSummaryRoutes() {
    // Hydration
    this.app.get('/usersummary-service/hydration/allData/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        valueInML: garminData.hydration,
        goalInML: 2500,
      });
    });

    // User Summary
    this.app.get('/usersummary-service/usersummary/daily/:date', (req, res) => {
      const date = new Date(req.params.date);
      const garminData = generateGarminDataForDate(date);

      res.json({
        steps: garminData.steps,
        calories: Math.floor(garminData.steps! * 0.04),
        distance: garminData.steps! * 0.0008,
        floorsClimbed: Math.floor(Math.random() * 10),
        activeMinutes: Math.floor(Math.random() * 60) + 30,
      });
    });
  }

  /**
   * Startet den Mock Server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🚀 Garmin API Mock Server running on http://localhost:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stoppt den Mock Server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Garmin API Mock Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Fügt Session Token hinzu (für Tests)
   */
  public addSessionToken(token: string): void {
    this.sessionTokens.add(token);
  }

  /**
   * Setzt Error Rate
   */
  public setErrorRate(rate: number): void {
    this.config.errorRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Setzt Latency
   */
  public setLatency(ms: number): void {
    this.config.latency = Math.max(0, ms);
  }
}

/**
 * Standalone Server (für CLI)
 */
export async function startMockServer(config?: MockServerConfig): Promise<GarminApiMockServer> {
  const server = new GarminApiMockServer(config);
  await server.start();
  return server;
}

/**
 * CLI Entry Point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3001');
  const latency = parseInt(process.env.LATENCY || '100');
  const errorRate = parseFloat(process.env.ERROR_RATE || '0');

  startMockServer({ port, latency, errorRate }).catch(console.error);
}
