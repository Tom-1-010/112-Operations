#!/usr/bin/env node

import { env } from './env';
import { log } from './log';
import { Scheduler } from './scheduler';

async function main() {
  const command = process.argv[2];

  log.info(`${env.APP_NAME} worker starting`, {
    command,
    nodeEnv: env.NODE_ENV,
  });

  switch (command) {
    case 'start':
      await startWorker();
      break;
    case 'help':
      showHelp();
      break;
    default:
      log.error('Unknown command. Use "help" for available commands.');
      process.exit(1);
  }
}

async function startWorker() {
  try {
    // Initialize scheduler
    const scheduler = new Scheduler({
      incidentGen: {
        enabled: env.NODE_ENV === 'development', // Enable in dev for testing
        intervalMs: env.WORKER_INTERVAL_MS,
        maxIncidents: 10,
        locationBounds: {
          north: 52.5,
          south: 52.0,
          east: 5.0,
          west: 4.5,
        },
      },
      cleanup: {
        enabled: false, // Disabled by default
        intervalMs: 3600000, // 1 hour
        maxAgeHours: 24,
      },
    });

    // Start scheduler
    scheduler.start();

    // Keep process alive
    log.info('Worker started successfully. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log.info('Shutting down worker...');
      scheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log.info('Shutting down worker...');
      scheduler.stop();
      process.exit(0);
    });

  } catch (error) {
    log.error('Failed to start worker', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
MeldkamerSpel Worker

Usage: pnpm worker <command>

Commands:
  start    Start the background worker
  help     Show this help message

Environment Variables:
  SUPABASE_URL              Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Supabase service role key
  APP_NAME                  Application name (default: MeldkamerSpel Worker)
  NODE_ENV                  Environment (development/production/test)
  WORKER_INTERVAL_MS        Worker interval in milliseconds (default: 30000)
`);
}

// Run main function
main().catch((error) => {
  log.error('Unhandled error in main', error);
  process.exit(1);
});
