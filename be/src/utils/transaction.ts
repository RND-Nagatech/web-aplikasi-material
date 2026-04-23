import mongoose from 'mongoose';

const DEFAULT_MAX_RETRIES = 3;

const isRetryableTransactionError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;

  const errorWithLabels = error as Error & {
    errorLabels?: string[];
    hasErrorLabel?: (label: string) => boolean;
  };

  if (typeof errorWithLabels.hasErrorLabel === 'function') {
    if (errorWithLabels.hasErrorLabel('TransientTransactionError')) return true;
    if (errorWithLabels.hasErrorLabel('UnknownTransactionCommitResult')) return true;
  }

  const labels = errorWithLabels.errorLabels ?? [];
  return labels.includes('TransientTransactionError') || labels.includes('UnknownTransactionCommitResult');
};

export const runWithTransaction = async <T>(
  runner: (session: mongoose.ClientSession) => Promise<T>,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result!: T;

      await session.withTransaction(
        async () => {
          result = await runner(session);
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
        }
      );

      return result;
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === maxRetries) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
};
