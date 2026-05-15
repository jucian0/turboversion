![turboversion-logo](./logo.svg)
# Turboversion 🚀

**Automated Semantic Versioning for Monorepos and Single Packages**

Turboversion is a powerful CLI tool that automates version bumps according to Semantic Versioning (SemVer). By analyzing your commit history or branch patterns, it intelligently determines version updates, saving you time and reducing human error in the versioning process.

## Features

- ✅ Automatic version bumps based on commit messages or branch names
- ✅ Monorepo support with both sync and async versioning modes
- ✅ Semantic Versioning (SemVer) compliance
- ✅ Customizable through `version.config.json`
- ✅ PNPM workspace optimized
- ✅ Supports prerelease versions
- ✅ Skip specific packages when needed

## Installation

```bash
# Using yarn
yarn add -D turboversion

# Using pnpm
pnpm add -D turboversion

# Using npm
npm install -D turboversion
```

## Usage Modes

### 🔄 Sync Mode (Default)
In sync mode, all packages share the same version number. Ideal for tightly coupled packages.

**Monorepo Example:**

```
packages/
  pkg-a/ (1.0.0)
  pkg-b/ (1.0.0)
  pkg-c/ (1.0.0)
```

After `feat` commit → All become 1.1.0

**Single Package:** Updates the standalone package version.

Run with:

```bash
turboversion --bump [patch|minor|major]
```

### 🔀 Async Mode (Monorepos only)
Only updated packages get version bumps. Perfect for independent versioning.

**Example:**

```
packages/
  pkg-a/ (1.0.0) ← modified
  pkg-b/ (1.0.0)
  pkg-c/ (1.0.0) ← modified
```

After changes → pkg-a 1.0.1, pkg-c 1.1.0 (based on changes)

Run with:

```bash
turboversion --async
```

## Versioning Strategies

### 1. Semantic Commit Messages (Default)
Turboversion analyzes commit messages to determine version bumps:

| Commit Type | Version Bump | Example Message             |
|-------------|---------------|-----------------------------|
| fix         | Patch         | fix(button): correct color |
| feat        | Minor         | feat: add new component    |
| Breaking    | Major         | feat!: remove deprecated API |

**Full type list:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

### 2. Branch Pattern Strategy
Alternative approach using branch names:

```json
{
  "versionStrategy": "branchPattern",
  "branchPattern": ["major", "minor", "patch"]
}
```

Example: Merging a branch named `minor` will trigger a minor version bump.

## Configuration (`version.config.json`)
Configure Turboversion to match your workflow:

```json
{
  "tagPrefix": "v",
  "baseBranch": "main",
  "sync": false,
  "updateInternalDependencies": "patch",
  "skip": ["private-pkg"],
  "versionStrategy": "commitMessage",
  "branchPattern": ["major", "minor", "patch"],
  "prereleaseIdentifier": "beta.${branchName}",
  "skipHooks": false
}
```

**Key Options:**

| Option                 | Description                        | Default  |
|------------------------|------------------------------------|----------|
| tagPrefix             | Git tag prefix                     | v        |
| baseBranch            | Your main branch                   | main     |
| sync                  | Sync versioning mode               | false    |
| versionStrategy       | `commitMessage` or `branchPattern` | commitMessage |
| prereleaseIdentifier  | Prerelease tag (e.g., beta or beta.${branchName}) | -        |

`prereleaseIdentifier` supports template values. Use `${branchName}` to keep prerelease streams isolated per branch:

```json
{
  "prereleaseIdentifier": "beta.${branchName}"
}
```

For example, `feature/auth-flow` generates a branch-specific prerelease identifier like `beta-feature-auth-flow` instead of sharing the same `beta.0`, `beta.1` sequence with other branches.

## PNPM Workflow (Recommended)

```bash
# 1. Update versions
pnpm turboversion

# 2. Publish all updated packages
pnpm publish -r
```

## Command Reference

### Global Options

- `--help`: Show help
- `--version`: Show version

### Sync Mode Options

- `-b`, `--bump`: Version bump type (patch|minor|major|premajor|preminor|prepatch|prerelease)
- `-p`, `--prerelease`: Create prerelease using auto-detected bump type

### Async Mode Options

- `-t`, `--target`: Specific package to bump
- `-b`, `--bump`: Force specific bump type
- `-p`, `--prerelease`: Create prerelease using commit-detected bump type

### Prerelease with Auto-Detection

The `--prerelease` flag analyzes commits to determine the bump type and automatically converts it to a prerelease:

```bash
# With a feat commit: 1.0.0 -> 1.1.0-beta.0
# With a fix commit: 1.0.0 -> 1.0.1-beta.0
# With prereleaseIdentifier beta.${branchName}: 1.0.0 -> 1.1.0-beta-feature-auth-flow.0
turboversion --prerelease
```

## Why Turboversion?

⏱️ Saves time - No more manual version updates
🔒 Reduces errors - Automatic SemVer compliance
🤝 Improves collaboration - Clear version history
🧩 Monorepo optimized - Flexible versioning strategies
⚡ PNPM ready - Perfect workspace integration

## Learn More

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [PNPM Workspaces](https://pnpm.io/workspaces)
