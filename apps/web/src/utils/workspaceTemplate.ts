import type {
    SandpackFiles,
    SandpackPredefinedTemplate,
    SandpackSetup,
    SupportedLanguage,
} from '@improview/ui';
import type { ProblemPack, WorkspaceTemplate } from '../types/problem';

const DEFAULT_FILE_NAME = 'solution.js';

const ensureLeadingSlash = (value: string): string =>
    value.startsWith('/') ? value : `/${value}`;

const guessLanguage = (fileName: string): SupportedLanguage => {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx') || fileName.endsWith('.mts')) {
        return 'typescript';
    }
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.mjs')) {
        return 'javascript';
    }
    return 'plaintext';
};

const buildFunctionStub = (problem: ProblemPack): string => {
    const params = problem.api.params.map((p) => p.name).join(', ');
    return `function ${problem.api.function_name}(${params}) {
  // Your implementation here

}`;
};

const toSandpackFiles = (template: WorkspaceTemplate): SandpackFiles => {
    const files: SandpackFiles = {};
    for (const [path, file] of Object.entries(template.files)) {
        const normalized = ensureLeadingSlash(path);
        files[normalized] = file.hidden ? { code: file.code, hidden: file.hidden } : { code: file.code };
    }
    return files;
};

const toSandpackSetup = (template: WorkspaceTemplate, entry: string): SandpackSetup => {
    const setup: SandpackSetup = { entry };

    if (template.dependencies && Object.keys(template.dependencies).length > 0) {
        setup.dependencies = template.dependencies;
    }

    if (template.dev_dependencies && Object.keys(template.dev_dependencies).length > 0) {
        setup.devDependencies = template.dev_dependencies;
    }

    if (template.environment) {
        setup.environment = template.environment as SandpackSetup['environment'];
    }

    return setup;
};

export interface DerivedWorkspaceConfig {
    fileName: string;
    language: SupportedLanguage;
    initialCode: string;
    sandpackFiles?: SandpackFiles;
    sandpackSetup?: SandpackSetup;
    sandpackTemplate?: SandpackPredefinedTemplate;
}

export const deriveWorkspaceConfig = (problem: ProblemPack): DerivedWorkspaceConfig => {
    const fallback: DerivedWorkspaceConfig = {
        fileName: DEFAULT_FILE_NAME,
        language: 'javascript',
        initialCode: buildFunctionStub(problem),
    };

    const template = problem.workspace_template;
    if (!template || !template.entry || !template.files || Object.keys(template.files).length === 0) {
        return fallback;
    }

    const entryPath = ensureLeadingSlash(template.entry);
    const entryFile =
        template.files[template.entry] ??
        template.files[entryPath] ??
        template.files[entryPath.slice(1)];

    if (!entryFile) {
        return fallback;
    }

    const sandpackFiles = toSandpackFiles(template);
    const sandpackSetup = toSandpackSetup(template, entryPath);

    const sandpackTemplate = template.template
        ? (template.template as SandpackPredefinedTemplate)
        : undefined;

    const fileName = entryPath.replace(/^\//, '') || DEFAULT_FILE_NAME;
    const language = guessLanguage(fileName);

    return {
        fileName,
        language,
        initialCode: entryFile.code ?? fallback.initialCode,
        sandpackFiles,
        sandpackSetup,
        sandpackTemplate,
    };
};
