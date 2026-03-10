class PCMProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];
            // Send Float32Array data to main thread
            this.port.postMessage(channelData);
        }
        return true; // Keep processor alive
    }
}
registerProcessor('pcm-processor', PCMProcessor);
