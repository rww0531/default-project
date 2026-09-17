# Default Project

## Description

A full-stack development project with Python and Node.js support.

## 猜拳卡牌對戰（Game）

純前端（HTML/CSS/JS）的小遊戲，位於 `web/` 資料夾，直接用瀏覽器開啟 `web/index.html` 即可遊玩，無需安裝任何東西。

### 規則

- 石頭剋剪刀、剪刀剋布、布剋石頭。
- 雙方各有 100 點血量，每回合各出一張牌。
- 每張牌都有各自的傷害值。
- 贏的一方：對方扣掉「你這張牌」的傷害值。
- 平手（雙方同類型）：傷害較高者勝，對方扣掉「傷害差值」；傷害相同則真平手、雙方無傷。
- 先將對方血量降到 0 的一方獲勝。

### 遊玩方式

1. 從你的手牌中點擊一張卡牌。
2. 電腦會自動出牌與你對戰。
3. 點「再戰一場」可重新開始。

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
├── web/              # 猜拳卡牌對戰遊戲（瀏覽器直接開啟）
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
