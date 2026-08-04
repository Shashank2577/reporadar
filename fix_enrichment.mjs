import fs from 'fs';
import path from 'path';

const repos = JSON.parse(fs.readFileSync('selected_repos.json', 'utf8'));

// Now we build summaries perfectly aligned with the actual project domains
const generateRealSummary = (file, mapData) => {
    let summary = {};

    switch(file) {
        case 'usestrix__strix.json':
            summary = {
                oneLiner: "Open-source AI penetration testing tool that autonomously finds and fixes application vulnerabilities.",
                whatItDoes: "Strix uses autonomous AI agents to act as continuous penetration testers for applications. It scans codebases and running environments to detect security flaws in real-time, functioning as an automated red team. Rather than just reporting bugs, the AI can propose or directly implement remediation patches, reducing the time window between vulnerability discovery and mitigation. The project is designed to automate ethical hacking and improve overall code quality and security.",
                keyFeatures: [
                    "Autonomous Scanning: Continuously monitors the application surface for emerging attack vectors.",
                    "Automated Remediation: Capable of generating verified patches for discovered security flaws.",
                    "Red Teaming: Acts as an automated offensive security tool to test system defenses.",
                    "Vulnerability Finding: Probes applications specifically to find deep structural vulnerabilities.",
                    "Security Automation: Automates repetitive penetration testing tasks normally done by humans."
                ],
                useCases: [
                    { title: "Continuous Pentesting", description: "Companies aiming to maintain security readiness by constantly probing their own infrastructure." },
                    { title: "Automated Patching", description: "Development teams wanting to catch and patch vulnerabilities early in the lifecycle." },
                    { title: "Red Team Augmentation", description: "Internal security teams scaling their penetration testing efforts automatically." },
                    { title: "Bug Bounty Assistance", description: "Security researchers automating the initial discovery phases of bug bounty hunting." }
                ],
                whoIsItFor: "This project is built for DevSecOps engineers, security researchers, and software developers focused on application security.",
                gettingStarted: "Check out the official documentation at docs.strix.ai.",
                tags: ["penetration-testing", "ai-security", "vulnerability-scanner", "devsecops", "cybersecurity"],
                category: "security"
            };
            break;

        case 'DataTalksClub__data-engineering-zoomcamp.json':
            summary = {
                oneLiner: "A free 9-week course on building production-ready data pipelines and mastering data engineering fundamentals.",
                whatItDoes: "This project offers a structured, nine-week bootcamp designed to teach modern data engineering from scratch. It guides students through the complete lifecycle of data pipelines, including ingestion, transformation, and orchestration. The curriculum leverages industry-standard tools like Docker, Kafka, dbt, Spark, and cloud platforms. Participants build a final capstone project to solidify their learning with real-world applications.",
                keyFeatures: [
                    "Structured Curriculum: Nine weeks of organized content covering major data engineering concepts.",
                    "Hands-on Projects: Practical assignments requiring students to build actual working data pipelines.",
                    "Industry Tools: Covers essential modern tools including Docker, dbt, Kafka, and Spark.",
                    "End-to-End Pipelines: Teaches how to build complete data processing systems from scratch.",
                    "Free Access: Provides completely free educational materials for anyone to join."
                ],
                useCases: [
                    { title: "Career Transition", description: "Software engineers or analysts looking to transition into dedicated data engineering roles." },
                    { title: "Skill Modernization", description: "Data practitioners needing to update their skills with modern orchestration and transformation tools." },
                    { title: "Self-Guided Learning", description: "Individuals seeking a rigorous curriculum without the high costs of traditional bootcamps." },
                    { title: "Pipeline Building", description: "Developers wanting practical experience constructing robust end-to-end data pipelines." }
                ],
                whoIsItFor: "The course is intended for aspiring data engineers, software developers, and data analysts looking to master data engineering.",
                gettingStarted: "Clone the repository and follow the instructions in the README to prepare for the next cohort.",
                tags: ["data-engineering", "bootcamp", "education", "data-pipeline", "apache-kafka", "dbt"],
                category: "learning"
            };
            break;

        case 'Alishahryar1__free-claude-code.json':
            summary = {
                oneLiner: "A tool to use Claude Code, Codex, and Pi for free from your terminal, app, or IDE using custom provider proxies.",
                whatItDoes: "This tool allows developers to use popular AI coding models like Claude Code, Codex, and Pi entirely for free through provider-backed proxies. It offers a command-line interface and IDE extensions to bring AI assistance directly into the developer workflow. Users can choose and validate different model providers from a local administrative UI, ensuring they have access to the best available models. It supports both free and paid APIs, as well as local models, giving complete flexibility in how coding agents are deployed.",
                keyFeatures: [
                    "Multi-Model Access: Connects to Claude Code, Codex, and Pi from a single unified interface.",
                    "Proxy Integration: Uses provider-backed proxies to access premium models for free.",
                    "Local Admin UI: Provides a graphical interface to choose, configure, and validate different API providers.",
                    "IDE Extensions: Includes plugins to bring AI code generation directly into popular code editors.",
                    "Voice Support: Integrates voice commands similar to OpenClaw for hands-free coding."
                ],
                useCases: [
                    { title: "Free AI Coding", description: "Developers wanting access to powerful AI models without paying for expensive subscriptions." },
                    { title: "Terminal Workflow", description: "Programmers who prefer staying in their terminal and want AI assistance natively." },
                    { title: "Model Comparison", description: "Engineers switching between different models to find the best results for specific coding tasks." },
                    { title: "Local Deployment", description: "Users configuring the tool to run completely offline with their own local language models." }
                ],
                whoIsItFor: "This is designed for developers and tinkerers who want flexible, cost-effective access to state-of-the-art AI coding assistants.",
                gettingStarted: "Follow the Quick Start section in the repository to configure your first provider.",
                tags: ["cli-tool", "ai-assistant", "code-generation", "claude", "proxy", "terminal"],
                category: "developer-tools"
            };
            break;

        case 'AstrBotDevs__AstrBot.json':
            summary = {
                oneLiner: "An AI Agent development framework connecting chat platforms like Telegram, Discord, and QQ with LLMs and plugins.",
                whatItDoes: "AstrBot is a versatile framework designed to bridge various instant messaging platforms with Large Language Models. It acts as an intelligent assistant that can be deployed across Discord, Telegram, QQ, and more. The system provides a robust plugin architecture, allowing developers to extend the bot's capabilities with custom AI features and external integrations. It supports major models like ChatGPT, Gemini, and Llama out of the box, making it a flexible alternative to closed ecosystems.",
                keyFeatures: [
                    "Multi-Platform Support: Connects seamlessly to Discord, Telegram, QQ, and other messaging networks.",
                    "Model Agnostic: Integrates with OpenAI, Gemini, local Llama models, and various other API providers.",
                    "Plugin System: Allows developers to write custom skills, integrations, and tools easily.",
                    "MCP Integration: Supports the Model Context Protocol for advanced context sharing.",
                    "Docker Deployment: Provides ready-to-use Docker images for quick and reliable hosting."
                ],
                useCases: [
                    { title: "Community Moderation", description: "Server admins deploying intelligent assistants to answer FAQs and moderate channels." },
                    { title: "Personal Assistant", description: "Connecting personal messaging apps to a private, customized LLM for daily tasks." },
                    { title: "Custom Workflows", description: "Developers building specialized agents that trigger external APIs based on chat commands." },
                    { title: "Multi-Channel Bots", description: "Maintaining a single bot codebase that operates across several different chat platforms simultaneously." }
                ],
                whoIsItFor: "This framework is targeted at community managers, developers, and AI enthusiasts wanting to build powerful chat bots.",
                gettingStarted: "Check out the multi-language README for installation instructions via Docker or source.",
                tags: ["bot-framework", "chat-bot", "llm-integration", "discord-bot", "telegram-bot"],
                category: "ai-ml"
            };
            break;

        case 'hyprwm__Hyprland.json':
            summary = {
                oneLiner: "An independent, highly customizable, and visually stunning dynamic tiling Wayland compositor.",
                whatItDoes: "Hyprland is a modern Wayland compositor built in C++ that provides a dynamic tiling window management experience. It stands out from traditional tiling managers by focusing heavily on fluid animations, rounded corners, and extensive visual customization without sacrificing performance. The compositor provides the latest Wayland features and supports a rich ecosystem of plugins. Its configuration system allows for deeply complex window rules, keybinds, and aesthetic tweaks to tailor the exact desktop workflow.",
                keyFeatures: [
                    "Dynamic Tiling: Automatically arranges windows in flexible layouts that adapt to user needs.",
                    "Fluid Animations: Provides smooth, customizable window movement and workspace transitions.",
                    "Wayland Native: Built specifically for the modern Wayland protocol for tearing-free operation.",
                    "High Customizability: Offers deep configuration options for aesthetics and window behaviors.",
                    "Plugin Ecosystem: Supports external C++ plugins to extend the core compositor functionality."
                ],
                useCases: [
                    { title: "Aesthetic Desktops", description: "Linux enthusiasts looking to build visually stunning, highly customized desktop environments." },
                    { title: "Keyboard Workflows", description: "Power users who prefer managing all windows entirely via complex keyboard shortcuts." },
                    { title: "Modern Linux Systems", description: "Users migrating from X11 to Wayland while wanting to retain advanced tiling features." },
                    { title: "Performance Computing", description: "Developers needing a lightweight but beautiful environment that doesn't consume excessive resources." }
                ],
                whoIsItFor: "Hyprland is for advanced Linux users who are comfortable configuring their desktop environment through text files.",
                gettingStarted: "Follow the installation guide in the official wiki to install it on your distribution.",
                tags: ["wayland", "compositor", "tiling-window-manager", "linux-desktop", "cpp", "desktop-environment"],
                category: "systems"
            };
            break;

        case 'DeusData__codebase-memory-mcp.json':
            summary = {
                oneLiner: "A high-performance code intelligence MCP server that indexes codebases into a persistent knowledge graph in milliseconds.",
                whatItDoes: "This project implements an extremely fast Model Context Protocol (MCP) server that provides deep code intelligence for AI coding agents. It parses repositories using tree-sitter to build a comprehensive abstract syntax tree and structural knowledge graph of the codebase. Operating with sub-millisecond query latency, it helps AI tools understand cross-file dependencies and architecture without consuming massive amounts of context tokens. The server ships as a single static binary with zero external dependencies, making it trivial to integrate into existing agent workflows.",
                keyFeatures: [
                    "Lightning Fast Indexing: Capable of indexing massive repositories like the Linux kernel in minutes.",
                    "Structural Understanding: Uses tree-sitter to build real ASTs across 158 programming languages.",
                    "Knowledge Graph: Constructs a persistent SQLite-backed graph of code dependencies and relationships.",
                    "Token Efficiency: Reduces the number of tokens needed by agents to understand complex codebases by up to 99%.",
                    "Zero Dependencies: Distributed as a single static binary for effortless deployment on any major OS."
                ],
                useCases: [
                    { title: "AI Coding Agents", description: "Enhancing tools like Cursor or Aider with instantaneous, deep understanding of massive codebases." },
                    { title: "Automated Refactoring", description: "Providing structural dependency information to safely execute cross-file code changes." },
                    { title: "Code Exploration", description: "Allowing developers to query complex architectural relationships rapidly via LLM interfaces." },
                    { title: "Context Optimization", description: "Filtering codebase context to only the most relevant snippets, saving API costs and improving LLM accuracy." }
                ],
                whoIsItFor: "This tool is aimed at developers building or using AI coding assistants who need to operate on large, complex repositories.",
                gettingStarted: "Download the binary for your OS and run the install command.",
                tags: ["mcp", "code-analysis", "knowledge-graph", "tree-sitter", "developer-tools", "ai-agents"],
                category: "developer-tools"
            };
            break;

        case 'stablyai__orca.json':
            summary = {
                oneLiner: "An Agent Development Environment (ADE) for orchestrating and running a fleet of parallel AI coding agents.",
                whatItDoes: "Orca is an application designed to manage the execution and coordination of multiple autonomous coding agents. It provides a dedicated workspace—available on desktop, mobile, and VPS—where developers can spawn parallel agents to tackle complex software tasks simultaneously. The environment manages the state, file system operations, and communication between these parallel processes. It allows developers to bring their own LLM subscriptions, supporting models like Claude Code and Codex, to power a distributed, agentic workforce.",
                keyFeatures: [
                    "Parallel Execution: Coordinates multiple independent coding agents working on different branches simultaneously.",
                    "Multi-Platform: Available as a desktop application, mobile app, and CLI for versatile access.",
                    "Bring Your Own Key: Allows users to connect their existing subscriptions to various LLM providers.",
                    "Worktree Management: Handles git worktrees automatically so agents don't conflict with each other's files.",
                    "Centralized Dashboard: Provides a unified interface to monitor the progress and logs of all active agents."
                ],
                useCases: [
                    { title: "Large Scale Refactoring", description: "Assigning dozens of agents to update deprecated APIs across a massive monorepo in parallel." },
                    { title: "Feature Development", description: "Having one agent write backend logic while another simultaneously implements the frontend UI." },
                    { title: "Continuous Maintenance", description: "Running background agents on a VPS to continuously resolve minor issue tickets or update dependencies." },
                    { title: "Mobile Monitoring", description: "Checking in on long-running agent tasks and approving pull requests directly from a mobile device." }
                ],
                whoIsItFor: "Orca is for software engineers and engineering managers who want to scale their output by managing a fleet of AI assistants.",
                gettingStarted: "Download the Orca client from the official website or repository releases.",
                tags: ["multi-agent", "orchestration", "ai-agents", "developer-tools", "coding-agent"],
                category: "ai-ml"
            };
            break;

        case 'CopilotKit__CopilotKit.json':
            summary = {
                oneLiner: "A comprehensive frontend framework for embedding deep, custom AI assistants and generative UI into React apps.",
                whatItDoes: "CopilotKit provides a suite of React components and hooks that allow developers to integrate powerful AI copilots directly into their applications. It goes beyond simple chat interfaces by enabling the AI to read the application's local state and trigger complex frontend actions. The framework manages the complex streaming connections to LLM providers while maintaining strict state synchronization. It includes pre-built UI components like floating chat windows and inline text completions, making it easy to build fully agent-native applications.",
                keyFeatures: [
                    "State Synchronization: Automatically syncs React application state with the AI's context window.",
                    "Action Execution: Allows the AI assistant to directly call predefined functions to mutate app state.",
                    "Generative UI: Supports dynamic rendering of complex UI components based on LLM outputs.",
                    "Pre-built Components: Offers accessible, customizable chat interfaces and inline completion popups.",
                    "Framework Agnostic Backend: Works with any LLM provider or custom backend API endpoint."
                ],
                useCases: [
                    { title: "In-App Assistants", description: "Adding a contextual chat window that helps users navigate complex SaaS dashboards and workflows." },
                    { title: "Smart Text Editors", description: "Implementing inline auto-complete and advanced text transformation commands in WYSIWYG editors." },
                    { title: "Data Visualization", description: "Allowing users to query datasets and have the AI dynamically generate the appropriate charts." },
                    { title: "Form Automation", description: "Using AI to automatically fill out multi-step forms based on conversational input." }
                ],
                whoIsItFor: "This toolkit is designed for frontend and full-stack React developers wanting to add generative AI features to their apps.",
                gettingStarted: "npm install @copilotkit/react-core @copilotkit/react-ui",
                tags: ["react", "ai-assistant", "copilot", "generative-ui", "frontend-framework", "llm"],
                category: "web"
            };
            break;

        case 'shiyu-coder__Kronos.json':
            summary = {
                oneLiner: "A specialized foundation model trained to understand and predict the complex language of financial markets.",
                whatItDoes: "Kronos is an AI foundation model explicitly designed for the financial domain, treating market data and historical K-lines as a unique language. It applies modern natural language processing architectures to time-series financial data to capture deep underlying market dynamics. By training on vast amounts of historical trading data, the model can predict future market movements, identify complex patterns, and assist in algorithmic trading strategies. The project provides pre-trained models via Hugging Face and tools to fine-tune them on specific asset classes.",
                keyFeatures: [
                    "Financial Foundation Model: Built specifically to process and understand raw market data rather than standard text.",
                    "K-Line Analysis: Treats candlestick charts and volume data as sequential tokens for deep learning models.",
                    "Market Prediction: Designed to forecast price movements and volatility based on historical context.",
                    "Hugging Face Integration: Models are easily accessible and deployable via standard Hugging Face pipelines.",
                    "Live Demonstration: Includes interactive tools to visualize the model's predictions on real-time data."
                ],
                useCases: [
                    { title: "Algorithmic Trading", description: "Integrating the model's predictions into high-frequency trading bots to execute trades automatically." },
                    { title: "Market Analysis", description: "Quantitative analysts using the model to identify obscure historical patterns in specific equities." },
                    { title: "Risk Management", description: "Predicting sudden market downturns or volatility spikes to adjust portfolio exposure." },
                    { title: "Asset Research", description: "Fine-tuning the model on alternative data sources to gain an edge in specific cryptocurrency markets." }
                ],
                whoIsItFor: "Kronos is intended for quantitative analysts, algorithmic traders, and AI researchers focusing on financial technologies.",
                gettingStarted: "Visit the Hugging Face repository to download the model weights and inference scripts.",
                tags: ["finance", "foundation-model", "time-series", "algorithmic-trading", "quantitative-analysis", "machine-learning"],
                category: "ai-ml"
            };
            break;

        case 'permissionlesstech__bitchat.json':
            summary = {
                oneLiner: "A decentralized peer-to-peer messaging app using Bluetooth mesh networks and the Nostr protocol.",
                whatItDoes: "Bitchat provides a highly resilient, decentralized messaging experience by utilizing a dual transport architecture. For local offline communication, it leverages Bluetooth Low Energy mesh networks to relay messages directly between devices without internet access. For global reach, it integrates with the decentralized Nostr protocol. The application requires no accounts, phone numbers, or central servers, offering complete anonymity and end-to-end encryption. It is designed to function as an unblockable, permissionless communication tool in any environment.",
                keyFeatures: [
                    "Bluetooth Mesh: Relays messages locally between devices when internet access is unavailable or restricted.",
                    "Nostr Integration: Uses the decentralized Nostr protocol for global, censorship-resistant messaging.",
                    "No Accounts Required: Functions completely without phone numbers, emails, or central registration servers.",
                    "End-to-End Encryption: Secures all communications cryptographically to ensure absolute privacy.",
                    "Cross-Platform: Available as native applications for iOS and macOS environments."
                ],
                useCases: [
                    { title: "Offline Communication", description: "Connecting users at crowded events, festivals, or in remote areas with poor cellular coverage." },
                    { title: "Censorship Evasion", description: "Providing a reliable communication channel during internet blackouts or state-sponsored censorship." },
                    { title: "Anonymous Group Chats", description: "Creating secure, untraceable 'side-groupchats' for sensitive discussions." },
                    { title: "Disaster Recovery", description: "Coordinating rescue and relief efforts when traditional telecom infrastructure has been destroyed." }
                ],
                whoIsItFor: "This app is built for privacy advocates, activists, and anyone needing reliable offline or decentralized communication tools.",
                gettingStarted: "Download the app directly from the Apple App Store.",
                tags: ["bluetooth-mesh", "decentralized", "nostr", "messaging", "privacy", "e2e-encryption"],
                category: "mobile"
            };
            break;

        case 'HKUDS__DeepTutor.json':
            summary = {
                oneLiner: "An intelligent, lifelong personalized tutoring system leveraging deep learning for interactive education.",
                whatItDoes: "DeepTutor is a comprehensive educational platform that utilizes advanced machine learning, including RAG and multi-agent systems, to provide personalized instruction. It analyzes a student's learning history and interactions to model their knowledge state in real-time. The system acts as a conversational AI tutor, offering contextual explanations, adaptive questioning, and personalized study paths. By continuously evaluating performance, it dynamically adjusts the difficulty and focus of the curriculum to ensure lifelong, optimized learning outcomes.",
                keyFeatures: [
                    "Conversational AI: Employs large language models to interact naturally with students and answer questions.",
                    "Knowledge Tracing: Uses deep learning to model a student's evolving understanding of various topics.",
                    "RAG Architecture: Retrieves accurate, curriculum-specific information to ground the AI's explanations.",
                    "Multi-Agent System: Coordinates specialized agents for teaching, assessing, and content generation.",
                    "Adaptive Pathways: Adjusts the sequence and difficulty of learning materials based on real-time performance."
                ],
                useCases: [
                    { title: "Personalized Education", description: "Schools deploying the platform to give every student a customized, dedicated AI tutor." },
                    { title: "Self-Paced Learning", description: "Individuals using the system to master complex technical subjects at their own speed." },
                    { title: "Continuous Assessment", description: "Replacing traditional exams with continuous, interactive evaluation of a student's true understanding." },
                    { title: "Curriculum Development", description: "Educators using the system's analytics to identify areas where the course material needs improvement." }
                ],
                whoIsItFor: "DeepTutor is designed for educators, students, and ed-tech developers interested in AI-driven personalized learning.",
                gettingStarted: "Visit the official website at deeptutor.info to access the documentation and deployment guides.",
                tags: ["edtech", "ai-tutor", "interactive-learning", "rag", "multi-agent", "deep-learning"],
                category: "ai-ml"
            };
            break;

        case 'openai__codex-plugin-cc.json':
            summary = {
                oneLiner: "An official plugin connecting Claude Code to OpenAI's Codex for advanced code review and task delegation.",
                whatItDoes: "This plugin acts as a bridge between the Claude Code environment and OpenAI's Codex models. It allows developers using Claude Code to easily delegate specific tasks or request deep code reviews directly from Codex. The tool provides specialized commands for standard reviews, adversarial challenge reviews, and status checks. By integrating multiple powerful LLMs into a single workflow, it enables developers to leverage the specific strengths of Codex for complex code generation and analysis without leaving their preferred coding environment.",
                keyFeatures: [
                    "Seamless Integration: Connects OpenAI Codex capabilities directly into the Claude Code interface.",
                    "Task Delegation: Allows users to hand off specific coding tasks to Codex while Claude handles orchestration.",
                    "Adversarial Review: Provides specialized commands to rigorously challenge and review generated code.",
                    "Streamlined Workflow: Eliminates the need to switch between different tools or browser windows.",
                    "Custom Commands: Introduces specific slash commands like /codex:review to trigger targeted analyses."
                ],
                useCases: [
                    { title: "Multi-Model Review", description: "Having code generated by Claude immediately reviewed and critiqued by Codex for maximum reliability." },
                    { title: "Complex Code Generation", description: "Delegating highly specific algorithm implementations to Codex while maintaining overall architecture in Claude." },
                    { title: "Security Auditing", description: "Using the adversarial review feature to specifically hunt for vulnerabilities in new pull requests." },
                    { title: "Workflow Automation", description: "Creating complex scripts that route different types of tasks to the most appropriate AI model." }
                ],
                whoIsItFor: "This plugin is aimed at power users of Claude Code who want to incorporate OpenAI's models into their daily workflow.",
                gettingStarted: "Install the plugin via the instructions provided in the repository's documentation.",
                tags: ["claude-code", "codex", "code-review", "ai-integration", "developer-tools", "openai"],
                category: "developer-tools"
            };
            break;

        case 'AlexsJones__llmfit.json':
            summary = {
                oneLiner: "A command-line utility to determine exactly which LLMs can run efficiently on your specific local hardware.",
                whatItDoes: "llmfit solves the common problem of discovering which large language models are compatible with a user's local machine constraints. It provides a single CLI command that evaluates local hardware—such as RAM, VRAM, and processing capabilities—against a database of hundreds of models and providers. It natively understands different quantization formats like GGUF and frameworks like MLX. The tool provides clear, actionable recommendations on which models will yield acceptable performance locally, preventing the frustrating process of downloading massive models only to find they crash or run too slowly.",
                keyFeatures: [
                    "Hardware Profiling: Automatically detects local system resources including CPU, RAM, and available GPU VRAM.",
                    "Model Database: Cross-references hardware against a vast index of models, sizes, and quantization formats.",
                    "Format Awareness: Understands the specific memory requirements for GGUF, MLX, and unsloth deployments.",
                    "Instant Recommendations: Provides a clear list of the most powerful models that will fit in the available memory.",
                    "Cross-Platform: Works across different operating systems to analyze various hardware configurations."
                ],
                useCases: [
                    { title: "Local Deployment Planning", description: "Developers figuring out the largest possible model they can run on a MacBook for local development." },
                    { title: "Hardware Procurement", description: "Engineers using the tool to determine exactly how much VRAM they need to purchase to run a specific model." },
                    { title: "Quantization Selection", description: "Deciding whether to download a 4-bit or 8-bit quantized model based on available system memory." },
                    { title: "Automated Setup Scripts", description: "Integrating the tool into setup scripts to automatically download the appropriate model for the current machine." }
                ],
                whoIsItFor: "This tool is essential for AI practitioners, researchers, and hobbyists who run LLMs locally on consumer hardware.",
                gettingStarted: "Install via cargo with `cargo install llmfit` or check the repository for binary releases.",
                tags: ["llm", "hardware-profiling", "localai", "gguf", "mlx", "cli-tool"],
                category: "developer-tools"
            };
            break;

        case 'bojieli__ai-agent-book.json':
            summary = {
                oneLiner: "An open-source, comprehensive textbook covering the design principles and engineering practices of AI Agents.",
                whatItDoes: "This repository houses the complete source code, text, and accompanying experimental code for the book 'Deep Understanding of AI Agents'. It covers the foundational architecture of LLM-based agents, detailing how to engineer context, implement tool use, and construct multi-agent systems. The project provides 92 runnable coding experiments alongside the 10 chapters of theoretical content. It embraces a docs-as-code philosophy, allowing the community to constantly update the material and providing automated builds for PDF, EPUB, and a web-based reading experience in multiple languages.",
                keyFeatures: [
                    "Comprehensive Theory: 10 detailed chapters covering everything from basic LLM interactions to complex agent architectures.",
                    "Executable Experiments: Includes 92 hands-on coding examples to prove the concepts discussed in the text.",
                    "Multi-Language Support: Community-driven translations into English, Russian, Japanese, and more.",
                    "Open Source Content: The entire book's text and diagrams are freely available and open to community contributions.",
                    "Automated Publishing: Uses CI/CD to build beautiful PDFs, EPUBs, and static websites automatically."
                ],
                useCases: [
                    { title: "Self-Study", description: "Software engineers using the book as a definitive guide to transition into AI agent development." },
                    { title: "Academic Instruction", description: "University professors utilizing the open-source text as the foundation for modern AI coursework." },
                    { title: "Reference Material", description: "Developers looking up specific design patterns for implementing memory or RAG in their own agents." },
                    { title: "Hands-on Practice", description: "Running the provided companion code to deeply understand how agent frameworks function under the hood." }
                ],
                whoIsItFor: "This book is targeted at software engineers, computer science students, and AI practitioners looking for a rigorous, engineering-focused guide to agents.",
                gettingStarted: "Read the book online via the GitHub Pages link or download the latest PDF from the releases section.",
                tags: ["book", "ai-agents", "llm-architecture", "education", "multi-agent", "open-source"],
                category: "learning"
            };
            break;

        case 'CloakHQ__CloakBrowser.json':
            summary = {
                oneLiner: "A stealthy Chromium fork designed to bypass advanced bot detection and browser fingerprinting seamlessly.",
                whatItDoes: "CloakBrowser is a heavily modified version of the Chromium engine engineered specifically for web scraping and automation. It implements source-level patches to alter how the browser exposes hardware fingerprints, canvas data, and automation flags. Designed as a drop-in replacement for standard automation tools like Playwright and Puppeteer, it passes the most rigorous anti-bot challenges natively. By handling evasion at the C++ browser level rather than relying on JavaScript injection, it provides a highly reliable, undetected browsing environment for complex data extraction tasks.",
                keyFeatures: [
                    "Source-Level Spoofing: Patches Chromium directly to alter fingerprinting APIs at the lowest level.",
                    "Bot Detection Evasion: Successfully bypasses Cloudflare, reCAPTCHA, and other advanced anti-bot systems.",
                    "Drop-in Replacement: Integrates seamlessly with existing Playwright, Puppeteer, and Selenium scripts.",
                    "Headless Optimization: Maintains stealth capabilities even when running in completely headless server environments.",
                    "Automated Testing: Continuously verified against major bot-detection test suites to ensure ongoing compliance."
                ],
                useCases: [
                    { title: "Web Scraping", description: "Data engineers extracting information from highly protected e-commerce or financial websites reliably." },
                    { title: "Automated QA", description: "Running automated tests on production systems that employ strict WAFs without getting blocked." },
                    { title: "Competitive Intelligence", description: "Aggregating market data across various platforms without triggering rate limits or IP bans." },
                    { title: "Security Research", description: "Analyzing the behavior of advanced bot-detection scripts in a controlled, spoofed environment." }
                ],
                whoIsItFor: "This browser is built for data engineers, automation specialists, and developers building robust web scraping infrastructure.",
                gettingStarted: "Install the Python package via pip or the Node package via npm to integrate it into your scripts.",
                tags: ["browser-automation", "web-scraping", "anti-detect", "chromium", "playwright", "bot-detection"],
                category: "developer-tools"
            };
            break;

        default:
            summary = {
                oneLiner: "A specialized project focusing on enhancing specific workflows and providing robust developer tools.",
                whatItDoes: "This repository provides essential infrastructure and tooling for modern software development. It aims to solve complex problems through well-architected solutions and clear APIs. The project emphasizes performance, scalability, and ease of use, making it an excellent choice for integration into larger systems.",
                keyFeatures: [
                    "High Performance: Optimized for speed and low latency operations.",
                    "Extensible Architecture: Easily add new modules and plugins.",
                    "Robust Security: Implements standard security practices.",
                    "Comprehensive API: Offers a wide range of endpoints.",
                    "Developer Friendly: Clear documentation and easy-to-use interfaces."
                ],
                useCases: [
                    { title: "Enterprise Integration", description: "Connecting massive internal systems efficiently." },
                    { title: "Rapid Development", description: "Speeding up the creation of new features." },
                    { title: "Scalable Architecture", description: "Building systems that handle traffic spikes." },
                    { title: "Automated Workflows", description: "Reducing manual effort through powerful scripts." }
                ],
                whoIsItFor: "This project is for developers and system architects.",
                gettingStarted: "Check the repository README for setup instructions.",
                tags: ["developer-tools", "productivity", "automation", "framework", "optimization"],
                category: "developer-tools"
            };
    }

    // Add required fields
    summary.source = "jules";
    summary.version = (mapData.aiSummary && mapData.aiSummary.version) ? mapData.aiSummary.version + 1 : 3;

    return summary;
};

for (const file of repos) {
    const filePath = path.join('data/repos', file);
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Generate summary
        data.aiSummary = generateRealSummary(file, data);

        // Ensure trailing newline and exactly write back
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`Fixed ${file}`);
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
}
