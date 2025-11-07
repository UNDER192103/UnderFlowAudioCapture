import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Writable } from 'stream';
import wav from 'wav';

// --- Configuração de Caminho e Formato ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// O executável está em '../bin/UnderFlowAudioCapture.exe'
const exePath = path.join(__dirname, '..', 'bin', 'UnderFlowAudioCapture.exe');

// Formato de áudio fixo conforme bin/info.md: PCM bruto (16-bit, 48kHz, estéreo)
const AUDIO_FORMAT = {
  sampleRate: 48000,
  channels: 2,
  bitDepth: 16,
};

// --- Tipos e Interfaces (para referência) ---

/**
 * @typedef {'mic' | 'loopback'} CaptureType
 * @typedef {'raw' | 'wav'} OutputFormat
 * 
 * @typedef {object} CaptureOptions
 * @property {OutputFormat} [format='raw'] - O formato de saída. 'raw' para PCM bruto, 'wav' para chunks de WAV.
 * @property {string} deviceId - O ID do dispositivo ou 'default'.
 * 
 * @typedef {object} DeviceInfo
 * @property {string} id - O ID completo do dispositivo.
 * @property {string} name - O nome amigável do dispositivo.
 * @property {'Render' | 'Capture'} type - O tipo de dispositivo (saída ou entrada).
 */

// --- Implementação da Classe ---

class UnderFlowAudioCapture {
  /** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
  #captureProcess = null;
  /** @type {Writable | null} */
  #audioStream = null;
  /** @type {boolean} */
  #isCapturing = false;

  constructor() {
    // Adiciona um listener para garantir que o processo filho seja encerrado
    // se o processo principal do Node.js for encerrado.
    this.#setupExitHandler();
  }

  /**
   * Configura o handler de saída para garantir a limpeza do processo filho.
   * @private
   */
  #setupExitHandler() {
    const cleanup = () => {
      if (this.#captureProcess && this.#isCapturing) {
        console.log(`[UnderFlowAudioCapture] Encerrando processo filho PID: ${this.#captureProcess.pid} antes de sair.`);
        this.#captureProcess.kill('SIGKILL'); // Força o encerramento
      }
    };

    // Garante a limpeza em saídas normais (process.exit()) e não tratadas (Ctrl+C, erros)
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(2);
    });
    process.on('uncaughtException', (err) => {
      console.error('Exceção não tratada:', err);
      cleanup();
      process.exit(99);
    });
  }

  /**
   * Lista os dispositivos de áudio disponíveis.
   * @returns {Promise<DeviceInfo[]>} Uma promessa que resolve com a lista de dispositivos.
   */
  static async listDevices() {
    return new Promise((resolve, reject) => {
      const listProcess = spawn(exePath, ['list'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      listProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      listProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      listProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Falha ao listar dispositivos (código ${code}): ${error}`));
        }

        const devices = [];
        const lines = output.trim().split('\n');
        let currentDevice = {};

        for (const line of lines) {
          if (line.startsWith('ID:')) {
            currentDevice.id = line.substring(4).trim();
          } else if (line.startsWith('Name:')) {
            currentDevice.name = line.substring(6).trim();
          } else if (line.startsWith('Type:')) {
            currentDevice.type = line.substring(6).trim();
            devices.push(/** @type {DeviceInfo} */ (currentDevice));
            currentDevice = {};
          }
        }
        resolve(devices);
      });

      listProcess.on('error', (err) => {
        reject(new Error(`Erro ao executar o processo de listagem: ${err.message}`));
      });
    });
  }

  /**
   * Inicia a captura de áudio.
   * @param {CaptureType} type - O tipo de captura ('mic' ou 'loopback').
   * @param {CaptureOptions} options - Opções de captura, incluindo deviceId.
   * @returns {Writable} O stream de áudio (PCM bruto ou chunks de WAV).
   */
  #startCapture(type, options) {
    if (this.#isCapturing) {
      throw new Error('A captura já está em andamento. Chame .stop() primeiro.');
    }

    const { deviceId, format = 'raw' } = options;

    if (type !== 'mic' && type !== 'loopback') {
      throw new Error("O tipo de captura deve ser 'mic' ou 'loopback'.");
    }

    const args = ['capture', type, deviceId];

    this.#captureProcess = spawn(exePath, args, {
      stdio: ['pipe', 'pipe', 'inherit'], // Corrigido para 'pipe' no stdin
    });

    this.#isCapturing = true;

    if (format === 'wav') {
      // Cria um stream de transformação para converter PCM bruto em chunks de WAV
      const wavWriter = new wav.Writer(AUDIO_FORMAT);
      this.#audioStream = wavWriter;

      this.#captureProcess.stdout.on('data', (chunk) => {
        if (!wavWriter.writableEnded) {
          wavWriter.write(chunk);
        }
      });

      // Quando o processo de captura fecha, finaliza o writer WAV
      this.#captureProcess.on('close', () => {
        this.#isCapturing = false;
        if (!wavWriter.writableEnded) {
          wavWriter.end();
        }
      });

      this.#captureProcess.on('error', (err) => {
        this.#isCapturing = false;
        wavWriter.emit('error', err);
      });

    } else { // 'raw'
      // Retorna o stdout bruto do processo
      this.#audioStream = this.#captureProcess.stdout;
      
      this.#captureProcess.on('close', () => {
        this.#isCapturing = false;
      });
      
      this.#captureProcess.on('error', () => {
        this.#isCapturing = false;
      });
    }

    return this.#audioStream;
  }

  /**
   * Inicia a captura de áudio do microfone.
   * @param {CaptureOptions} options - Opções de captura, incluindo deviceId.
   * @returns {Writable} O stream de áudio.
   */
  startMic(options) {
    return this.#startCapture('mic', options);
  }

  /**
   * Inicia a captura de áudio loopback (saída do sistema).
   * @param {CaptureOptions} options - Opções de captura, incluindo deviceId.
   * @returns {Writable} O stream de áudio.
   */
  startLoopback(options) {
    return this.#startCapture('loopback', options);
  }

  /**
   * Encerra o processo de captura de áudio.
   * @returns {boolean} True se o processo foi encerrado, false se não estava capturando.
   */
  stop() {
    if (this.#captureProcess && this.#isCapturing) {
      const pid = this.#captureProcess.pid;
      const killed = this.#captureProcess.kill('SIGTERM');
      this.#captureProcess = null;
      this.#audioStream = null;
      this.#isCapturing = false;
      console.log(`[UnderFlowAudioCapture] Processo PID ${pid} encerrado via .stop().`);
      return killed;
    }
    return false;
  }

  /**
   * Verifica se a captura está ativa.
   * @returns {boolean}
   */
  get isCapturing() {
    return this.#isCapturing;
  }
}

export default UnderFlowAudioCapture;