# 🎙️ UnderFlow Audio Capture

Um utilitário em **C++ (Visual Studio 2022)** que captura áudio do **microfone** ou **saída do sistema (loopback)** usando a **API WASAPI** do Windows 10+ e envia os dados em tempo real como **PCM bruto (16-bit, 48kHz, estéreo)** para o `stdout`.

Pode ser integrado facilmente com aplicações **Node.js** via `child_process.spawn()`.

---

## 🧩 Funcionalidades

✅ Captura de áudio em tempo real  
✅ Suporte a entrada (microfone) ou saída (loopback do sistema)  
✅ Retorno contínuo em chunks de **PCM bruto (s16le)** via `stdout`  
✅ Listagem de dispositivos de entrada e saída disponíveis  
✅ Controle total via parâmetros CLI  
✅ Compatível com **Node.js**, **Python**, ou qualquer processo que leia `stdout` binário  

---

## ⚙️ Requisitos

- **Windows 10 ou superior**
- **Visual Studio 2022** (com a carga de trabalho "Desenvolvimento com C++ Desktop")
- **SDK do Windows 10/11**
- **Driver de áudio funcional**

---

## 🏗️ Compilação

1. Abra o **Visual Studio 2022**.
2. Crie um novo projeto do tipo **“Aplicativo de Console (C++)”**.
3. Substitua o conteúdo do arquivo principal (`.cpp`) pelo código do `UnderFlowAudioCapture.cpp`.
4. Compile em **Release x64**.
5. O executável final estará em:

