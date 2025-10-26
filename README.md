# FramerD

AI-powered prose review for fiction writers. FramerD analyzes your writing for grammar, spelling, style, and clarity issues, providing actionable suggestions with one-click fixes.

## Features

- **Real-time AI Review**: Powered by Claude Sonnet 4.5 for intelligent prose analysis
- **Quick Fixes**: Apply suggestions with a single click (Cmd+. or Ctrl+.)
- **Custom Dictionary**: Add character names, invented terms, and project-specific vocabulary
- **Streaming Results**: Get feedback as the review progresses
- **Smart Categorization**: Distinguishes between spelling errors and wrong word choices
- **Fiction-Focused**: Understands literary style, dialogue, and narrative voice


## Requirements

- **Anthropic API Key**: You'll need a Claude API key from [Anthropic](https://console.anthropic.com/)
- **VSCode**: Version 1.105.0 or higher

## Setup

1. **Install the extension** from the VSCode Marketplace (or from VSIX)

2. **Add your API key**: Create a `.env` file in your project root:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

3. **Open a text file** (any file type works, but best for prose/fiction)

4. **Run a review**: 
   - Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   - Type "FramerD: Review Prose"
   - Or set a custom keybinding

## Usage

### Running a Review

1. Open your prose document
2. Run command: `FramerD: Review Prose`
3. Wait for diagnostics to appear (streaming, so you'll see them incrementally)
4. Review the squiggles and suggestions

### Applying Fixes

- **Hover** over a squiggle to see the suggestion
- Press **Cmd+.** (Mac) or **Ctrl+.** (Windows/Linux) to see quick fix options
- Select **"FramerD: Apply fix"** to accept the change
- Or select **"Add to dictionary"** for legitimate words flagged as errors

### Custom Dictionary

For character names, invented terms, or project-specific vocabulary:

1. Right-click a spelling diagnostic
2. Select "Add to dictionary"
3. The word will be saved to `.vscode/settings.json` (workspace) or global settings
4. Future reviews won't flag this word

### Clear Diagnostics

Run command: `FramerD: Clear Diagnostics` to remove all current suggestions.

## Extension Settings

This extension contributes the following settings:

* `framerd.dictionary`: Array of custom words to accept (character names, invented terms)
* `framerd.defaultPrompt`: Default review style (gentle, strict, bold, etc.)
* `framerd.prompts`: Custom review presets with different approaches

## Known Limitations

**Version 0.1.0 - Early Release**

- Reviews entire document at once (can be slow for 10k+ words)
- Requires manual API key setup
- AI may occasionally miss obvious errors or flag false positives
- Dictionary feature requires workspace folder to be open
- No undo for applied fixes (use Cmd+Z / Ctrl+Z)

## Troubleshooting

### "API_KEY not found"
Create a `.env` file in your project root with `ANTHROPIC_API_KEY=your-key`

### "No active document window"
Open a file before running the review command

### Diagnostics not showing
Check the "FramerD" output panel (View → Output → Select "FramerD")

### Copilot conflicts
Disable GitHub Copilot for prose files to avoid conflicting suggestions

## Roadmap

- [ ] Chunk-based review for long documents
- [ ] Configurable severity filtering
- [ ] Style preference memory
- [ ] Local spell-check integration (aspell/hunspell)
- [ ] Multi-language support

## Release Notes

### 0.1.0

Initial release with core features:
- AI-powered prose review
- Quick fix code actions
- Custom dictionary support
- Streaming diagnostics

---

## For Developers

### Building from Source

```bash
git clone https://github.com/yourusername/framerd
cd framerd
npm install
npm run compile
```

### Running Tests

```bash
npm run test:unit    # Unit tests
npm run test:e2e     # End-to-end tests
npm run test         # All tests
```

### Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

## License

[Add license here - MIT recommended]

## Feedback

Found a bug? Have a feature request? Please open an issue on [GitHub](https://github.com/yourusername/framerd/issues).

---

**Enjoy cleaner prose!** 📝✨
