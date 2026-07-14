import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Disable looking for local models since we are running in CDN context
env.allowLocalModels = false;

let transcriber = null;

async function getTranscriber(progress_callback) {
  if (!transcriber) {
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      progress_callback,
    });
  }
  return transcriber;
}

self.onmessage = async (event) => {
  const { audioData } = event.data;
  if (!audioData) return;

  try {
    const pipe = await getTranscriber((data) => {
      if (data.status === 'progress') {
        self.postMessage({
          status: 'progress',
          file: data.file,
          progress: data.progress,
          loaded: data.loaded,
          total: data.total
        });
      }
    });

    self.postMessage({ status: 'transcribing' });

    const output = await pipe(audioData, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    self.postMessage({
      status: 'complete',
      chunks: output.chunks
    });
  } catch (err) {
    self.postMessage({
      status: 'error',
      message: err.message || String(err)
    });
  }
};
