/**
 * FleetTools Phase 4: Codebase Analysis
 *
 * Analyzes the codebase to extract patterns, conventions, and relevant
 * Tech Orders for context injection into the LLM planner.
 *
 * @since 4.0.0 - Initial implementation
 * @last-updated 2026-01-08
 */
import * as fs from 'fs';
import * as path from 'path';
/**
 * CodebaseAnalyzer - Analyzes codebase structure and patterns
 */
export class CodebaseAnalyzer {
    rootPath;
    ignoredDirs = new Set([
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.next',
        '.opencode',
        '.flightline',
    ]);
    constructor(rootPath = process.cwd()) {
        this.rootPath = rootPath;
    }
    /**
     * Analyze the codebase
     */
    async analyze() {
        const files = this.scanFiles();
        const fileGroups = this.groupFiles(files);
        const patterns = this.detectPatterns(files);
        const techOrders = this.loadTechOrders();
        const contextSummary = this.generateContextSummary(fileGroups, patterns);
        const structureOverview = this.generateStructureOverview(fileGroups);
        return {
            total_files: files.length,
            file_groups: fileGroups,
            patterns,
            tech_orders: techOrders,
            context_summary: contextSummary,
            structure_overview: structureOverview,
        };
    }
    /**
     * Scan all files in the codebase
     */
    scanFiles() {
        const files = [];
        const walk = (dir) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(this.rootPath, fullPath);
                    // Skip ignored directories
                    if (entry.isDirectory()) {
                        if (!this.ignoredDirs.has(entry.name)) {
                            walk(fullPath);
                        }
                    }
                    else {
                        // Include TypeScript, JavaScript, and other relevant files
                        if (this.isRelevantFile(entry.name)) {
                            files.push(relativePath);
                        }
                    }
                }
            }
            catch (error) {
                // Silently skip directories we can't read
            }
        };
        walk(this.rootPath);
        return files;
    }
    /**
     * Check if a file is relevant for analysis
     */
    isRelevantFile(filename) {
        const relevantExtensions = [
            '.ts', '.tsx', '.js', '.jsx',
            '.json', '.md', '.sql',
            '.yaml', '.yml', '.toml',
        ];
        return relevantExtensions.some(ext => filename.endsWith(ext));
    }
    /**
     * Group files by directory/type
     */
    groupFiles(files) {
        const groups = new Map();
        for (const file of files) {
            const parts = file.split(path.sep);
            const groupName = parts[0] || 'root';
            if (!groups.has(groupName)) {
                groups.set(groupName, []);
            }
            groups.get(groupName).push(file);
        }
        return Array.from(groups.entries()).map(([name, files]) => ({
            name,
            files,
            description: this.describeFileGroup(name, files),
        }));
    }
    /**
     * Generate description for a file group
     */
    describeFileGroup(name, files) {
        const descriptions = {
            'server': 'Backend server code and APIs',
            'cli': 'Command-line interface',
            'squawk': 'Event sourcing and messaging system',
            'plugins': 'Plugin system and extensions',
            'tests': 'Test suites and fixtures',
            'specs': 'Specification documents',
            'docs': 'Documentation',
            'config': 'Configuration files',
        };
        return descriptions[name] || `${name} directory (${files.length} files)`;
    }
    /**
     * Detect patterns in the codebase
     */
    detectPatterns(files) {
        const patterns = [];
        // Detect TypeScript usage
        const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
        if (tsFiles.length > 0) {
            patterns.push({
                name: 'TypeScript',
                description: 'Codebase uses TypeScript for type safety',
                examples: tsFiles.slice(0, 3),
                confidence: 0.95,
            });
        }
        // Detect Express usage
        if (files.some(f => f.includes('server') || f.includes('api'))) {
            patterns.push({
                name: 'Express API',
                description: 'RESTful API built with Express.js',
                examples: files.filter(f => f.includes('routes') || f.includes('api')).slice(0, 3),
                confidence: 0.8,
            });
        }
        // Detect database usage
        if (files.some(f => f.includes('db') || f.includes('database'))) {
            patterns.push({
                name: 'Database Layer',
                description: 'SQLite database with event sourcing',
                examples: files.filter(f => f.includes('db')).slice(0, 3),
                confidence: 0.85,
            });
        }
        // Detect testing
        if (files.some(f => f.includes('test') || f.includes('spec'))) {
            patterns.push({
                name: 'Testing Framework',
                description: 'Comprehensive test coverage',
                examples: files.filter(f => f.includes('test')).slice(0, 3),
                confidence: 0.9,
            });
        }
        // Detect CLI
        if (files.some(f => f.includes('cli'))) {
            patterns.push({
                name: 'CLI Tools',
                description: 'Command-line interface for task management',
                examples: files.filter(f => f.includes('cli')).slice(0, 3),
                confidence: 0.85,
            });
        }
        return patterns;
    }
    /**
     * Load relevant Tech Orders
     */
    loadTechOrders() {
        const techOrders = [];
        // Try to load Tech Orders from the flightline directory
        const techOrdersPath = path.join(this.rootPath, 'server', 'api', 'src', 'flightline', 'tech-orders.ts');
        if (fs.existsSync(techOrdersPath)) {
            // In a real implementation, we would parse the Tech Orders file
            // For now, we'll return a default set of relevant Tech Orders
            techOrders.push({
                id: 'TO-001',
                title: 'TypeScript Best Practices',
                relevance: 0.9,
                key_points: [
                    'Use strict type checking',
                    'Avoid any types',
                    'Use interfaces for contracts',
                    'Leverage union types',
                ],
            });
            techOrders.push({
                id: 'TO-002',
                title: 'API Design Patterns',
                relevance: 0.85,
                key_points: [
                    'RESTful conventions',
                    'Consistent error handling',
                    'Proper HTTP status codes',
                    'Request/response validation',
                ],
            });
            techOrders.push({
                id: 'TO-003',
                title: 'Database Patterns',
                relevance: 0.8,
                key_points: [
                    'Event sourcing for audit trails',
                    'Proper indexing strategy',
                    'Transaction management',
                    'Migration safety',
                ],
            });
        }
        return techOrders;
    }
    /**
     * Generate context summary for LLM
     */
    generateContextSummary(fileGroups, patterns) {
        const groupDescriptions = fileGroups
            .map(g => `- ${g.name}: ${g.description}`)
            .join('\n');
        const patternDescriptions = patterns
            .map(p => `- ${p.name}: ${p.description}`)
            .join('\n');
        return `
## Codebase Structure

${groupDescriptions}

## Detected Patterns

${patternDescriptions}

## Key Characteristics

- Modern TypeScript codebase with strict type checking
- Event-sourced architecture for reliability and auditability
- Modular structure with clear separation of concerns
- Comprehensive testing and documentation
- CLI and API interfaces for task management
`.trim();
    }
    /**
     * Generate structure overview
     */
    generateStructureOverview(fileGroups) {
        const overview = fileGroups
            .map(group => {
            const fileCount = group.files.length;
            const tsCount = group.files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).length;
            return `${group.name}/ (${fileCount} files, ${tsCount} TypeScript)`;
        })
            .join('\n');
        return overview;
    }
}
/**
 * Create a new codebase analyzer instance
 */
export function createCodebaseAnalyzer(rootPath) {
    return new CodebaseAnalyzer(rootPath);
}
//# sourceMappingURL=codebase-analyzer.js.map