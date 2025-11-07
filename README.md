# 🎙️ UnderFlow Audio Capture

A robust Node.js wrapper for the `UnderFlowAudioCapture.exe` utility, designed for high-performance, real-time audio capture on Windows systems using the **WASAPI** API.

This library allows you to seamlessly capture audio from a **microphone** or **system output (loopback)**, delivering the raw PCM data or converting it directly into streamable WAV chunks.

## ✨ Features

*   **Real-Time Capture:** High-performance audio streaming via `child_process`.
*   **Microphone Input:** Capture audio from any connected input device.
*   **System Loopback:** Capture audio playing through your speakers (What You Hear).
*   **Flexible Output:** Choose between **Raw PCM (s16le, 48kHz, Stereo)** or **WAV Chunks** ready for file writing or streaming.
*   **Device Management:** Easily list all available audio devices (input and output).
*   **Safe Cleanup:** Guarantees the underlying `UnderFlowAudioCapture.exe` process is terminated when the Node.js application exits, preventing orphaned processes.

## 📦 Installation

Assuming you have the `UnderFlowAudioCapture.exe` and its dependencies correctly placed in the `bin/` directory:

```bash
npm install underflowaudiocapture
# or
yarn add underflowaudiocapture
```

## 🚀 Usage

### 1. Listing Available Devices

The `listDevices` method is static and returns a Promise resolving to an array of available audio devices.

```javascript
import UnderFlowAudioCapture from 'underflowaudiocapture';

async function getDevices() {
  try {
    const devices = await UnderFlowAudioCapture.listDevices();
    console.log('Available Devices:', devices);
    /*
    [
      { id: '{...}', name: 'Microphone (XYZ)', type: 'Capture' },
      { id: '{...}', name: 'Speakers (ABC)', type: 'Render' }
    ]
    */
  } catch (error) {
    console.error('Error listing devices:', error.message);
  }
}

getDevices();
```

### 2. Capturing Audio (Instance Usage)

The capture methods (`startMic`, `startLoopback`) are instance methods and require the class to be instantiated.

```javascript
import UnderFlowAudioCapture from 'underflowaudiocapture';
import fs from 'fs';

// Instantiate the capture manager
const capturador = new UnderFlowAudioCapture();

// --- Example: Capture Loopback to a WAV File ---
function captureToWav() {
  try {
    // Start loopback capture, outputting WAV chunks
    const audioStream = capturador.startLoopback({ 
      deviceId: 'default', // Use 'default' or a specific device ID
      format: 'wav' 
    });

    const fileWriter = fs.createWriteStream('output.wav');
    audioStream.pipe(fileWriter);

    console.log('Capturing system audio to output.wav...');

    // Stop capture after 10 seconds
    setTimeout(() => {
      capturador.stop();
      console.log('Capture stopped. File saved.');
    }, 10000);

  } catch (error) {
    console.error('Capture Error:', error.message);
  }
}

// --- Example: Capture Microphone (Raw PCM) ---
function captureRawMic() {
  try {
    // Start microphone capture, outputting raw PCM
    const rawStream = capturador.startMic({ 
      deviceId: 'default', 
      format: 'raw' 
    });

    rawStream.on('data', (chunk) => {
      // chunk is a Buffer containing raw PCM (s16le, 48kHz, Stereo)
      console.log(`Received raw PCM chunk: ${chunk.length} bytes`);
      // You would typically process or save this raw data here
    });

    console.log('Capturing raw microphone audio...');

    // Stop capture after 5 seconds
    setTimeout(() => {
      capturador.stop();
      console.log('Raw capture stopped.');
    }, 5000);

  } catch (error) {
    console.error('Capture Error:', error.message);
  }
}

// Run one of the examples
captureToWav();
```

### 3. Stopping Capture

The `stop()` method safely terminates the underlying `UnderFlowAudioCapture.exe` process.

```javascript
if (capturador.isCapturing) {
  capturador.stop();
}
```

## ⚙️ API Reference

### `new UnderFlowAudioCapture()`

Creates a new instance of the capture manager. This instance is responsible for managing one active capture process at a time.

### `UnderFlowAudioCapture.listDevices(): Promise<DeviceInfo[]>`

Lists all available audio devices.

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The unique WASAPI device ID. |
| `name` | `string` | The friendly name of the device. |
| `type` | `'Render' \| 'Capture'` | The device type (`Render` for output/loopback, `Capture` for input/mic). |

### `capturador.startMic(options): Writable`

Starts microphone audio capture. Throws an error if a capture is already active.

### `capturador.startLoopback(options): Writable`

Starts system loopback audio capture. Throws an error if a capture is already active.

#### `options` Object

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `deviceId` | `string` | N/A | **Required.** The device ID from `listDevices()` or `'default'`. |
| `format` | `'raw' \| 'wav'` | `'raw'` | The output format. `'raw'` streams PCM data; `'wav'` streams WAV file chunks. |

### `capturador.stop(): boolean`

Stops the currently active capture process. Returns `true` if a process was successfully killed, `false` otherwise.

### `capturador.isCapturing: boolean`

A getter property that returns `true` if a capture process is currently running.

## ⚠️ Requirements

*   **Operating System:** Windows 10 or higher (due to WASAPI dependency).
*   **Executable:** The `UnderFlowAudioCapture.exe` must be present in the `bin/` directory relative to the library root.

## 📄 License

[Include your license information here, e.g., MIT License]
