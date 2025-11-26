import { log } from './log';
import { generateIncident, IncidentGenConfig } from './jobs/incidentGen';
import { cleanup, CleanupConfig } from './jobs/cleanup';

export interface SchedulerConfig {
  incidentGen: IncidentGenConfig;
  cleanup: CleanupConfig;
}

const defaultConfig: SchedulerConfig = {
  incidentGen: {
    enabled: false,
    intervalMs: 60000, // 1 minute
    maxIncidents: 10,
    locationBounds: {
      north: 52.5,
      south: 52.0,
      east: 5.0,
      west: 4.5,
    },
  },
  cleanup: {
    enabled: false,
    intervalMs: 3600000, // 1 hour
    maxAgeHours: 24,
  },
};

export class Scheduler {
  private config: SchedulerConfig;
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  constructor(config: SchedulerConfig = defaultConfig) {
    this.config = config;
  }

  start(): void {
    if (this.isRunning) {
      log.warn('Scheduler already running');
      return;
    }

    log.info('Starting scheduler', this.config);

    // Start incident generation
    if (this.config.incidentGen.enabled) {
      const incidentInterval = setInterval(
        () => generateIncident(this.config.incidentGen),
        this.config.incidentGen.intervalMs
      );
      this.intervals.push(incidentInterval);
      log.info('Incident generation started', {
        intervalMs: this.config.incidentGen.intervalMs,
      });
    }

    // Start cleanup
    if (this.config.cleanup.enabled) {
      const cleanupInterval = setInterval(
        () => cleanup(this.config.cleanup),
        this.config.cleanup.intervalMs
      );
      this.intervals.push(cleanupInterval);
      log.info('Cleanup started', {
        intervalMs: this.config.cleanup.intervalMs,
      });
    }

    this.isRunning = true;
    log.info('Scheduler started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      log.warn('Scheduler not running');
      return;
    }

    log.info('Stopping scheduler');

    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });

    this.intervals = [];
    this.isRunning = false;

    log.info('Scheduler stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    log.info('Scheduler config updated', this.config);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});
