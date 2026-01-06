
# tModLoader Docs MCP Server

An MCP server that provides tools to search and retrieve documentation for tModLoader classes.

## Tools

### `search_tmodloader_classes`
Searches for classes, interfaces, and structs in the tModLoader documentation.
- **Input**: `query` (string)
- **Output**: List of matching classes with descriptions and URLs.

### `read_class_docs`
Fetches the content of a specific class documentation page and converts it to Markdown.
- **Input**: `url` (string) - Full URL from the search results.
- **Output**: Markdown content of the documentation.

## Installation & Usage

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build**:
   ```bash
   npm run build
   # or
   npx tsc
   ```

3. **Configure in MCP Client**:
   Add this configuration to your MCP settings (e.g., `claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "tmodloader-docs": {
         "command": "node",
         "args": ["/absolute/path/to/fetch-tmod/dist/index.js"]
       }
     }
   }
   ```
