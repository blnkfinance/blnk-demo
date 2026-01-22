# Blnk Demo Repository

This repository contains lightweight, end-to-end Blnk demos designed to help developers understand how Blnk works in practice. Each demo is a self-contained example that demonstrates a specific Blnk workflow or use case.

## Contributing

We welcome contributions! This repository grows through community contributions of demos that showcase different Blnk capabilities.

### Adding a New Demo

To add a new demo to this repository:

1. **Create a self-contained demo directory**: Each demo lives in its own folder at the root level (e.g., `basic-wallet/`, `customer-statements/`, `populate/`). Each demo is completely self-contained with its own:
   - `package.json` (or equivalent dependency file for your language)
   - `.env.example` and `.env` files
   - `README.md` explaining what the demo does
   - Source code and any necessary configuration files

2. **Follow the development guidelines**: When creating your demo, follow these guidelines:

   **Setup and Structure:**
   - Each demo must live in its own folder at the root level (e.g., `basic-wallet/`, `customer-statements/`).

   **Code Guidelines:**
   - Comments should explain **why** code exists, not just **what** it does. If the code is self-explanatory, omit the comment.
   - Use clear, descriptive names for demos and files. Keep naming consistent across demos. Use hyphens to separate multiwords, e.g. `bulk-payroll`, etc.

   **Demo Requirements:**
   - Each demo must contain a short README.md explaining what the demo does and what it demonstrates. The goal of the README.md is not to document the code.
   - Demos should not require additional setup beyond environment variables and dependency installation.
   - Demos should be small, focused, and illustrate one clear Blnk workflow.
   - Do not aim for production-ready architecture. Avoid frameworks, complex abstractions, or premature optimization.
   - Error handling should be minimal and easy to follow.

3. **Language flexibility**: Demos can be created in any programming language. While the existing demos use TypeScript with Bun, you're welcome to contribute demos in Python, Go, Ruby, JavaScript, or any other language that works well for demonstrating Blnk workflows. Just ensure your demo:
   - Is self-contained and runnable
   - Includes clear setup instructions
   - Follows the same self-contained structure (own dependencies, environment variables, etc.)

4. **Keep it simple**: Demos should be small, focused, and illustrate one clear Blnk workflow. Avoid production-grade complexity—the goal is clarity and ease of understanding.

### Demo Structure

Each demo should follow this structure:

```
your-demo-name/
├── README.md          # What the demo does and how to run it
├── .env.example      # Example environment variables
├── package.json      # Dependencies (or equivalent for your language)
└── index.ts          # Entry point (or equivalent for your language)
```

### Getting Started

1. Fork and clone this repository
2. Create your demo directory at the root level
3. Set up your demo following the structure above
4. Extract relevant guidelines from `AGENTS.md` and adapt them for your demo's README
5. Submit a pull request with your contribution

### Questions?

If you have questions about contributing or need help getting started, please open an issue in this repository.
