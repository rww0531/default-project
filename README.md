# Default Project

## Description

A full-stack development project with Python and Node.js support.

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 22+
- npm 10+
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd default-project

# Install Python dependencies
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Install Node.js dependencies
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Development

```bash
# Run Python tests
pytest

# Run Node.js tests
npm test

# Start development server
npm run dev
```

## Project Structure

```
.
├── src/              # Source code
├── tests/            # Test files
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── .github/          # GitHub workflows
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
