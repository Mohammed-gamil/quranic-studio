# 🌙 Quranic Studio

<p align="center">
  <img src="assets/banner.png" alt="Quranic Studio Banner" width="100%" style="border-radius: 8px;" onerror="this.style.display='none'" />
</p>

<p align="center">
  <strong>An elegant, automated video generation platform designed to align sacred Quranic recitation audio with divine text, translations, and beautiful background animations.</strong>
</p>

<p align="center">
  <a href="https://github.com/Mohammed-gamil/quranic-studio/stargazers"><img src="https://img.shields.io/github/stars/Mohammed-gamil/quranic-studio?color=D4AF37&style=for-the-badge" alt="Stars" /></a>
  <a href="https://github.com/Mohammed-gamil/quranic-studio/network/members"><img src="https://img.shields.io/github/forks/Mohammed-gamil/quranic-studio?color=D4AF37&style=for-the-badge" alt="Forks" /></a>
  <a href="https://github.com/Mohammed-gamil/quranic-studio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Mohammed-gamil/quranic-studio?color=D4AF37&style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/Open%20Source-100%25%20Free-success?color=2E7D32&style=for-the-badge" alt="100% Free" />
</p>

---

## 📖 The Vision & Philosophy

**Quranic Studio** is built as an act of service for devout Muslims, content creators, and Dawah organizations. Its primary objective is to take the complexity out of video creation so that the beauty of the Quran can be shared effortlessly and elegantly across the globe.

### 🔬 Reverse Engineering Voice-to-Ayah Sync
At the heart of this project is a technical challenge: **How can we mathematically and dynamically align the audio of a Sheikh (reciter) with the corresponding Arabic Quranic text (Ayat)?** 

Traditionally, video creators spent hours in editing software (Premiere Pro, CapCut) manually cutting, timing, and aligning subtitles frame-by-frame. Quranic Studio reverse-engineers this alignment workflow by:
1. **Dynamic Metadata Fetching**: Querying verse-by-verse and word-by-word timing data from public APIs (such as Quran.com and MP3Quran).
2. **Fallback Synchronization Heuristics**: Utilizing an intelligent character-count and phonetic syllable estimation algorithm to auto-span timing even when precise word-level database entries are unavailable.
3. **Automated FFmpeg Pipeline**: Slicing the audio, generating precise subtitle files (SRT/ASS), looping the video assets, and layering them seamlessly in real-time.

---

## 🕊️ 100% Free & Open Source Forever

This project is built for **everyone**. It is a gift to the global Muslim Ummah and the open-source community. 
* **Fork it**: You are free to copy, modify, and build upon this project.
* **Customize it**: Use your own brand assets, adjust the CSS design systems, or connect different APIs.
* **No Restrictions**: Anyone can change anything. There are no paywalls, no tracking, and no proprietary lock-ins.

---

## ✨ Features at a Glance

* 🎬 **Professional Video Export**: Automatically renders dynamic Quran videos with embedded metadata (Surah name, Ayah range, and Reciter name) directly into the MP4 file details.
* ⚡ **High-Precision Sync**: Aligns audio timestamps with Arabic (Uthmani) script and English translations.
* 🌀 **Smart Looping Engine**: Automatically loops short background videos or stretches static images to fit the exact audio length using optimized FFmpeg parameters.
* 📂 **Local Media Library**: Built-in library folders for images, videos, and outputs (`data/media/library/exports`).
* 📤 **User Uploads Support**: Drop in your custom backgrounds (MP4, MOV, JPEG, PNG, WEBP) to create unique aesthetics.
* 📶 **Smooth HTTP Range Streaming**: Exported video feeds support HTTP Range headers for fast, smooth scrubbing and previewing in web browsers.
* 🖥️ **Flexible Formats**: Renders both **Vertical (9:16)** for TikTok/Reels and **Horizontal (16:9)** for YouTube.
* 🗄️ **SQLite Performance Cache**: Leverages a local SQLite database to cache Quranic text and query metadata, ensuring ultra-fast second-runs.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, and Motion for smooth micro-animations.
* **Backend**: Node.js & Express API server with TSX (TypeScript Execute) runtime.
* **Video Processing**: FFmpeg (integrated via `ffmpeg-static` for zero-install setup).
* **Database**: SQLite (via `better-sqlite3` for high-performance synchronous queries).
* **Validation**: Zod schema-first request validation.
* **Logging**: Pino structured logging.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Mohammed-gamil/quranic-studio.git
   cd quranic-studio
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (Optional)**
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   PEXELS_API_KEY=your_pexels_key_here     # For automatic cinematic video searches
   PIXABAY_API_KEY=your_pixabay_key_here   # For automatic fallback imagery
   PORT=3000
   ```

### Run the Studio

You can use the automated cross-platform startup scripts to easily check/install dependencies and start the application in one step:

* **Linux / macOS**:
  ```bash
  ./run.sh
  ```
* **Windows**:
  Double-click `run.bat` or run:
  ```cmd
  run.bat
  ```

Alternatively, you can run the commands manually:

* **Development Mode** (Vite Dev Server + Express Hot Reload):
  ```bash
  npm run dev
  ```
  Open your browser to `http://localhost:3000` to access the visual studio interface.

* **Production Mode**:
  Build the React frontend assets and start the production Express server:
  ```bash
  npm run build
  npm start
  ```

---

## 📁 Repository Structure

```
quranic-studio/
├── data/
│   ├── fonts/            # Sacred calligraphy fonts (Amiri, Tajawal, Noto Naskh)
│   └── media/            # Audio cache, custom backgrounds, and outputs
├── src/                  # React Frontend Visual Studio
├── server.ts             # Express Server for rendering and library hosting
├── packages/
│   └── engine/           # Core video generation & audio sync engine
│       ├── adapters/     # Quran.com, MP3Quran, and Media API integrations
│       ├── pipeline/     # Subtitle layout generator and FFmpeg compiler
│       └── db/           # Better-SQLite3 schema & cache methods
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

---

## 🤝 Contributing

This is a community-driven repository! We invite developers, audio engineers, translators, and designers to collaborate:
1. **Fork** the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request**.

We hope this project makes it easy for you to share Quranic reminders with excellence. If you like the tool, please give it a ⭐ star on GitHub to help others find it!

---

*“Invite to the way of your Lord with wisdom and good instruction...”* — **Surah An-Nahl (16:125)**
