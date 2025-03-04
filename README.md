# Project Mate CLI

[Website](https://fsdtking.github.io/project-mate-cli/) | English | [简体中文](./README.zh-CN.md)

A powerful project management command-line tool designed to simplify project development and management processes.

## Features

- 🚀 Quick Project Launch (currently supports npm script commands only)
- 📦 Unified Project Management (fuzzy search for all projects and text, open with default editor)
- 🚄 Friendly Git Branch Management Assistant (manage branch notes and search similar branches globally with fuzzy words)
- 🔧 Convenient Command Line Tools
- 🌈 Cross-platform Support

## Installation

```bash
npm install -g project-mate-cli
```

Or using yarn:

```bash
yarn global add project-mate-cli
```

## Usage

Basic command format:

```bash
pm <command> [options]
```

### Common Commands

- `pm search` - Global multi-threaded fuzzy search, excluding dist, node_modules and other directories, supports remote search for gitlab and github repositories, see `pm search --help` for detailed usage
- `pm open` - Open project with default editor
- `pm br` - Branch management, supports managing branch notes and global fuzzy search for branches or branch notes, see `pm br --help` for detailed usage
- `pm run` - Execute project scripts with default script executor, see `pm run --help` for detailed usage
- `pm config` - Configure project, see `pm config --help` for detailed usage

For more commands and options, run:

```bash
pm --help
```

## Development

### Requirements

- Node.js >= 18
- npm or yarn

### Local Development

```bash
# Clone repository
git clone https://github.com/fsdtking/project-mate-cli.git

# Install dependencies
npm install

# Build project
npm run build

# Start development environment
npm start
```

## Contributing

We welcome all forms of contributions, including but not limited to:

- Submitting issues and suggestions
- Improving documentation
- Submitting code improvements
- Sharing usage experiences

Please ensure before submitting a Pull Request:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE). This means you can freely use, modify, and distribute this project, but you need to retain the original license and copyright information.
