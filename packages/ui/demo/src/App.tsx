import { useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeEditorPanel,
  Input,
  Label,
  ScrollArea,
  SkipLink,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  type TestResult,
} from '@improview/ui';
import { motion } from 'framer-motion';

const PASSING_RESULTS: TestResult[] = [
  { id: 'public-1', status: 'pass', label: 'Public • basic case', timeMs: 12 },
  { id: 'public-2', status: 'pass', label: 'Public • empty input', timeMs: 10 },
  { id: 'hidden-1', status: 'pass', label: 'Hidden • performance', timeMs: 18 },
];

const FAILING_RESULTS: TestResult[] = [
  { id: 'public-1', status: 'pass', label: 'Public • basic case', timeMs: 12 },
  { id: 'hidden-1', status: 'fail', label: 'Hidden • reversed array', timeMs: 24, expected: [3, 2, 1], actual: [1, 2, 3] },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'actions', label: 'Actions & Inputs' },
  { id: 'layout', label: 'Layout & Content' },
  { id: 'workspace', label: 'Workspace Experience' },
];

const App = () => {
  const heroChips = useMemo(
    () => [
      { label: 'Geist everywhere', description: 'Sans-serif default, mono editor' },
      { label: 'Design tokens first', description: 'CSS variables + Tailwind integration' },
      { label: 'Light / Dark', description: 'System aware, one toggle' },
    ],
    [],
  );

  const handleRunTests = async (code: string) => {
    console.info('Run tests clicked', { code });
    await wait(600);
    return PASSING_RESULTS;
  };

  const handleSubmit = async (code: string) => {
    console.info('Submit clicked', { code });
    await wait(900);
    const normalized = code.replace(/\s/g, '').toLowerCase();
    const passed = normalized.includes('reverse');
    return {
      passed,
      results: passed ? PASSING_RESULTS : FAILING_RESULTS,
    };
  };

  return (
    <div className="flex min-h-screen bg-bg-default text-fg-default">
      <SkipLink href="#main-content" />
      <aside className="hidden w-64 border-r border-border-subtle bg-bg-panel lg:flex">
        <nav className="sticky top-0 h-screen w-full">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-fg-muted">Demo</p>
              <p className="text-base font-semibold text-fg-default">Improview UI</p>
            </div>
            <ThemeToggle />
          </div>
          <ScrollArea className="h-[calc(100vh-64px)]">
            <ul className="space-y-2 px-6 pb-6">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-fg-muted hover:bg-bg-sunken/80 hover:text-fg-default"
                    href={`#${section.id}`}
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </nav>
      </aside>

      <main id="main-content" className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10 lg:px-12">
          <div className="mb-6 flex items-center justify-end lg:hidden">
            <ThemeToggle />
          </div>
          <header id="overview" className="mb-12 space-y-6">
            <div className="flex flex-col gap-3">
              <Badge variant="accent" className="w-fit">
                Improview
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-fg-default">
                Pastel-first components for coding interview flows.
              </h1>
              <p className="max-w-2xl text-base text-fg-muted">
                Every primitive you need to ship the Improview workspace: deterministic tokens, editor chrome, and productive defaults inspired by the Figma reference.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {heroChips.map((chip) => (
                <motion.div
                  key={chip.label}
                  whileHover={{ y: -2 }}
                  className="rounded-lg border border-border-subtle bg-bg-panel/80 p-4 shadow-sm"
                >
                  <p className="text-sm font-semibold text-fg-default">{chip.label}</p>
                  <p className="mt-1 text-xs text-fg-muted">{chip.description}</p>
                </motion.div>
              ))}
            </div>
          </header>

          <section id="actions" className="mb-16 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-fg-default">Actions & Inputs</h2>
              <p className="text-sm text-fg-muted">Buttons, toggles, and form primitives wired to the token system.</p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Button variants</CardTitle>
                <CardDescription>Deterministic states with motion tuned to 180ms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button size="sm" weight="normal">
                    Small
                  </Button>
                  <Button size="pill">Pill</Button>
                  <Button size="icon" aria-label="Run tests">
                    ▶
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@improview.dev" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" optional>
                      Notes
                    </Label>
                    <Textarea id="notes" placeholder="Leave an interviewer note…" rows={4} />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-sunken/70 p-4">
                  <div>
                    <p className="text-sm font-medium text-fg-default">Keyboard-first by default</p>
                    <p className="text-xs text-fg-muted">Focus rings map to tokens, respecting reduced motion.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-muted">Hints enabled</span>
                    <Switch defaultChecked aria-label="Toggle hints" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="layout" className="mb-16 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-fg-default">Layout & Content</h2>
              <p className="text-sm text-fg-muted">Cards, tabs, and scroll primitives keep the experience tactile.</p>
            </div>
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Attempt summary</CardTitle>
                  <CardDescription>Adaptive layout responds to breakpoints from the token set.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="success">3 public tests</Badge>
                  <Badge variant="accent">2 hidden tests</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="statement">
                  <TabsList>
                    <TabsTrigger value="statement">Statement</TabsTrigger>
                    <TabsTrigger value="discussion">Discussion</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="statement" className="mt-4 border border-border-subtle bg-bg-elevated p-4 text-sm leading-relaxed text-fg-muted">
                    You receive a stream of integers representing classroom attendance. Implement <code className="font-mono text-fg-default">summarizeAttendance</code> to report the moving average over the last <strong>k</strong> sessions.
                  </TabsContent>
                  <TabsContent value="discussion" className="mt-4 border border-border-subtle bg-bg-elevated p-4 text-sm text-fg-muted">
                    Pairing mode integrates presence detection and in-app chat. Copy is deterministic per product spec.
                  </TabsContent>
                  <TabsContent value="history" className="mt-4 border border-border-subtle bg-bg-elevated p-4 text-sm text-fg-muted">
                    Attempts persist in DynamoDB with per-test metrics and reviewer notes. UI tokens map to status categories.
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          <section id="workspace" className="mb-16 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-fg-default">Workspace Experience</h2>
                <p className="text-sm text-fg-muted">The coding surface mirrors the Figma reference with pastel editor chrome.</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">Monospace isolated</Badge>
                <Badge variant="outline">Results + console</Badge>
              </div>
            </div>
            <CodeEditorPanel
              defaultValue={`function reverseList(nums) {\n  return [...nums].reverse();\n}\n`}
              onRunTests={handleRunTests}
              onSubmit={handleSubmit}
              runLabel="Run tests"
              submitLabel="Submit attempt"
              fileName="solution.ts"
            />
          </section>

          <footer className="mb-6 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-6 text-xs text-fg-muted">
            <span>Improview UI · v0.1</span>
            <span>Design tokens: /packages/ui/src/theme/tokens.json</span>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
