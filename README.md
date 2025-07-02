# ReadBridge: AI-Enhanced Reading Assistant for Language Learning

*[English](./README.md) | [中文](./README.zh-CN.md)*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/) [![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/) [![Web](https://img.shields.io/badge/Platform-Web-blue)](https://nextjs.org/) [![Windows](https://img.shields.io/badge/Platform-Windows-blue?logo=windows&logoColor=white)](https://tauri.app/) [![macOS](https://img.shields.io/badge/Platform-macOS-blue?logo=apple&logoColor=white)](https://tauri.app/) [![Linux](https://img.shields.io/badge/Platform-Linux-blue?logo=linux&logoColor=white)](https://tauri.app/)

[![Documentation](https://img.shields.io/badge/Documentation-docs.readbridge.cc-blue)](https://docs.readbridge.cc/)

ReadBridge is an AI-powered reading assistant available as both a web application and desktop software (via Tauri). It enhances language learning through the "n+1" comprehensible input approach, helping learners engage with content in their target language.

## Overview

This reading assistant enables a source-to-source language learning approach, reducing reliance on translation to your native language. The platform helps learners practice reading within the target language ecosystem, supporting natural language acquisition through contextual understanding.

## Comprehensible Input Theory

ReadBridge draws inspiration from Stephen Krashen's Comprehensible Input Hypothesis, which suggests:

- **Natural Acquisition**: We acquire language when we understand messages in context
- **Input Level**: Learning is effective when input is slightly above current competence
- **Focus on Meaning**: Understanding content takes precedence over explicit grammar study

## Project Origin

The inspiration for ReadBridge came from a video I stumbled upon while browsing, which completely transformed my understanding of language learning. The video discussed three major challenges in language learning:

- **Arbitrary Symbol Challenge**: Memorizing words is like remembering meaningless symbols, making this type of memory easily forgotten
- **Breadth Challenge**: Vocabulary is as vast as an ocean, and pure memorization is like trying to scoop up the sea with a bucket
- **Depth Challenge**: Word meaning is as deep as a well, and rote memorization only scratches the surface

What impressed me most was the concept that "only 1-2 unknown words per 100 words" creates comprehensible input, and that "a word needs to be repeated at least 12 times in different contexts" to be truly mastered. This made me realize that learning vocabulary in context is as natural and effective as solving a puzzle.

The video also introduced the story of Hungarian linguist Lomb Kato, who mastered 15 languages through reading original works, and research showing that ten novels by Sidney Sheldon could cover over 90% of college-level English vocabulary, with each word repeated an average of 26 times. Studies suggest that regular reading may be the primary source of most of our vocabulary, and with just half an hour of daily reading, we could complete one million words in a year.

"Only this kind of reading is true reading" — this statement became my motivation for developing ReadBridge. If you're interested in this learning method, I recommend watching this video: https://www.bilibili.com/festival/jzj2023?bvid=BV1ns4y1A7fj

## Key Features

- **Interactive Reading Interface**: Progress through texts sentence-by-sentence with an intuitive UI
- **AI Reading Support**: Get explanations in the target language to maintain immersion
- **User-Defined Difficulty**: Set prompt templates based on your self-assessed proficiency level
- **Contextual Learning**: Explore vocabulary and grammar structures in authentic contexts
- **Progress Tracking**: Save your reading position across chapters and books
- **Customizable Configuration**: Adjust settings to match your learning preferences
- **Cross-Platform**: Use in any modern browser or as a desktop application
- **Book Management**: Easily import, organize, and access your reading materials
- **Distraction-Free Design**: Clean interface designed for focused reading

## Getting Started

### Web Version

1. Clone the repository
   ```bash
   git clone https://github.com/WindChimeEcho/read-bridge.git
   cd read-bridge
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the development server
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Desktop Version (Tauri)

1. Follow the [Tauri v2 setup guide](https://v2.tauri.app/guides/quick-start/prerequisites) to install prerequisites
   
2. Install dependencies and build the application
   ```bash
   npm run tauri dev
   ```

## Downloads

You can download the latest version of ReadBridge from our GitHub releases:

- [All Releases](https://github.com/WindChimeEcho/read-bridge/releases)

## Deployment

Deploy your own instance of ReadBridge with just one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WindChimeEcho/read-bridge)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-orange.svg?style=for-the-badge&logo=cloudflare)](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)

## Configuration

ReadBridge offers several configuration options:

### AI Settings
- Configure different AI providers (OpenAI, etc.)
- Set up custom models and endpoints
- Manage API keys and access
- **Privacy Note**: Your API keys are never saved to our servers - they are stored locally in your browser's local storage for security

### Model Configuration
- Select default models for different functionalities
- Customize model parameters

### Prompt Configuration
- Choose from preset prompt templates or create your own
- Customize prompts based on your language level and learning goals
- Adjust the type of assistance you receive while reading

### Sentence Processing
- Configure how texts are segmented and presented
- Adjust the reading flow to match your preferences

## How AI Enhances Reading

ReadBridge leverages AI in focused ways to support your reading:

- **Contextual Explanations**: Get clarifications about difficult passages in the target language
- **Vocabulary Support**: Understand new words through explanations rather than direct translations
- **Customized Assistance**: Receive help tailored to your self-selected proficiency level
- **Natural Language Interaction**: Ask questions about the text to deepen understanding

## Learning Approach

ReadBridge supports language acquisition through:

- **Immersion Reading**: Engage with authentic texts in the target language
- **Contextual Understanding**: Learn new elements through context rather than isolated study
- **Personalized Support**: Configure the AI assistance to match your current abilities
- **Reading Flow**: Maintain concentration with a distraction-free interface


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).
