import 'dotenv/config';
import { loadAndValidateConfig } from './config';
import { KeyService } from './keys/key.service';
import { EventListenerService } from './listener/event-listener.service';
import { FileLedgerCheckpointStore } from './listener/ledger-checkpoint';
import { RequestQueue } from './queue/request-queue';

async function main(): Promise<void> {
  // Fail fast before constructing any service with bad config.
  const config = loadAndValidateConfig();

  process.env.ORACLE_SECRET_KEY = config.secretKey;
  process.env.STELLAR_RPC_URL = config.rpcUrl;
  process.env.ORACLE_POLL_INTERVAL_MS = String(config.pollIntervalMs);

  const keyService = new KeyService();
  await keyService.initialize();

  const queue = new RequestQueue();
  const checkpointPath = process.env.ORACLE_CHECKPOINT_PATH ?? '.oracle-checkpoint.json';
  const checkpointStore = new FileLedgerCheckpointStore(checkpointPath);
  const oracleAddress = process.env.ORACLE_ADDRESS ?? keyService.getPublicKey();

  const listener = new EventListenerService(queue, oracleAddress, checkpointStore, {
    rpcUrl: config.rpcUrl,
    pollIntervalMs: config.pollIntervalMs,
  });

  await listener.initialize();
  await listener.startListening([config.factoryContractId]);
}

void main();
