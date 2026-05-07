const queue = [];
let isProcessing = false;

async function enqueueOCRJob(jobFn) {
  return new Promise((resolve, reject) => {
    queue.push({ jobFn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessing || queue.length === 0) return;

  isProcessing = true;
  const { jobFn, resolve, reject } = queue.shift();

  try {
    const result = await jobFn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    isProcessing = false;
    processQueue(); // process next job
  }
}

module.exports = { enqueueOCRJob };
