# Project Mate CLI

English | [简体中文](./README.zh-CN.md)

A powerful command-line tool designed to help you quickly search, open, and manage both local and remote projects.

## Features

- 🔍 Project Search: Support for both local and GitLab project search
- 📂 Project Opening: Quickly search and open local projects
- 🔄 Script Execution: Interactive running of npm scripts within projects
- 🌿 Branch Management: Add notes to branches for easy tracking and finding
- ⚙️ Configuration Management: Flexible configuration options

## Installation

```bash
npm install -g project-mate-cli
```

## Configuration

First-time setup requires configuring essential settings:

```bash
# Set local project root directory
pm config set local-project-root-directory "/path/to/your/projects"

# Set GitLab configuration (if using GitLab features)
pm config set gitlab-token "your-gitlab-token"
pm config set gitlab-api-url "your-gitlab-api-url"
```

## Usage

### Opening Projects

```bash
# List and open local projects
pm open

# Search and open specific project
pm open project-name
```

### Searching Projects

```bash
# Search local projects
pm search keyword

# Search GitLab projects
pm search keyword -g
```

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
### Running Scripts

```bash
# List and run npm scripts in the project
pm run
```

The script execution feature automatically detects the project type (client/server) and adds special markers for different types of commands:

- Client Projects:
  - 🚀 Development Server (dev, serve)
  - 📦 Build Commands (build)
  - 🧪 Test Commands (test)

- Server Projects:
  - 🚀 Start Server (start)
  - 🔄 Database Migration (migrate)
  - 🌱 Database Seeding (seed)

### Branch Management

```bash
# Add note to current branch
pm br set "This is a new feature branch"

# Add note to specific branch
pm br set feature/new-feature "This is a new feature branch"

# List all branches with notes
pm br list

# Search branches
pm br search keyword
```

### Configuration Management

```bash
# View all configurations
pm config get

# View specific configuration
pm config get gitlab-token

# Set configuration
pm config set local-project-root-directory "/path/to/projects"

# Set default editor (interactive)
pm config set editor
```

Supported Editors:
- Visual Studio Code (default)
- IntelliJ IDEA
- WebStorm
- PyCharm
- RustRover
- GoLand
- Windsurf
- Cursor
- Sublime Text
- Atom

Notes:
1. When running `pm config set editor`, only editors installed on your machine will be listed.
2. VSCode is used by default, falling back to IDEA if not installed.
3. If neither is installed, you'll be prompted to install recommended editors.

## Tips

1. The `pm open` command only searches first-level directories under the configured local project root directory.
2. Project type (client/server) is automatically detected based on project dependencies.
3. Branch note features require being in a Git repository directory.
4. Script running features require a package.json file in the project.

## Common Issues

1. If you can't open projects, ensure Windsurf is properly installed and configured.
2. If you can't search GitLab projects, check if your GitLab Token and API URL configurations are correct.
3. If project type detection is inaccurate, you can manually specify it by adding a "projectType" field in the project's package.json.
