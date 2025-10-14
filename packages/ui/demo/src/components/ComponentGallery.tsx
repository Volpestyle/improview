import { useState, type ReactNode } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  AspectRatio,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  Button,
  Calendar,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Label,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from '@improview/ui';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import './ComponentGallery.css';

const chartData = [
  { month: 'Jan', signups: 120, sessions: 850 },
  { month: 'Feb', signups: 160, sessions: 910 },
  { month: 'Mar', signups: 210, sessions: 980 },
  { month: 'Apr', signups: 240, sessions: 1040 },
];

const chartConfig = {
  signups: {
    label: 'New Signups',
    color: 'var(--chart-primary)',
  },
  sessions: {
    label: 'Live Sessions',
    color: 'var(--chart-secondary)',
  },
} satisfies ChartConfig;

const carouselSlides = [
  {
    title: 'Generate tailored prompts instantly',
    description: 'AI-assisted challenges with pacing guidance.',
  },
  {
    title: 'Stay in flow with timed practice',
    description: 'Dedicated focus intervals and restorative breaks.',
  },
  {
    title: 'Review insights at a glance',
    description: 'Heatmaps, streak tracking, and mood journals.',
  },
];

type GalleryCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function GalleryCard({ title, description, children }: GalleryCardProps) {
  return (
    <div className="component-gallery__card">
      <div className="component-gallery__card-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="component-gallery__card-body">{children}</div>
    </div>
  );
}

export function ComponentGallery() {
  const [sliderValue, setSliderValue] = useState<number[]>([42]);

  return (
    <section className="demo-section component-gallery" id="components">
      <h2 className="demo-section__title">Component Gallery</h2>
      <p className="demo-section__description">
        A quick tour through the freshly adopted primitives now available from <code>@improview/ui</code>.
        These samples are intentionally compact—open the component source for full API details.
      </p>

      <div className="component-gallery__grid">
        <GalleryCard title="Status & Messaging" description="Alerts, badges, skeleton loaders, and progress indicators.">
          <Alert className="gallery-stack">
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>We now ship Radix-based primitives with consistent tokens.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="gallery-stack">
            <AlertTitle>Action required</AlertTitle>
            <AlertDescription>Regenerate tokens to sync with the latest design audit.</AlertDescription>
          </Alert>
          <div className="gallery-inline">
            <Badge>New</Badge>
            <Badge variant="secondary">Beta</Badge>
            <Badge variant="outline">UI Refresh</Badge>
          </div>
          <Progress value={72} />
          <div className="gallery-skeletons">
            <Skeleton className="gallery-skeleton gallery-skeleton--avatar" />
            <div className="gallery-skeleton__text">
              <Skeleton className="gallery-skeleton" />
              <Skeleton className="gallery-skeleton gallery-skeleton--muted" />
            </div>
          </div>
        </GalleryCard>

        <GalleryCard title="Form Elements" description="Inputs, text areas, OTP, switches, checkboxes, and radio groups.">
          <div className="gallery-field">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Ari Voice" />
          </div>
          <div className="gallery-field">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Session feedback, discoveries, or follow-ups." />
          </div>
          <div className="gallery-field">
            <Label>Verification Code</Label>
            <InputOTP maxLength={4} defaultValue="8421">
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="gallery-inline">
            <Label className="gallery-control">
              <Checkbox defaultChecked /> Send recap email
            </Label>
            <Label className="gallery-control">
              <Switch defaultChecked /> Auto-transcribe
            </Label>
          </div>
          <RadioGroup defaultValue="weekly" className="gallery-radio">
            <Label className="gallery-radio__item">
              <RadioGroupItem value="daily" id="daily" />
              Daily practice
            </Label>
            <Label className="gallery-radio__item">
              <RadioGroupItem value="weekly" id="weekly" />
              Weekly cadence
            </Label>
            <Label className="gallery-radio__item">
              <RadioGroupItem value="monthly" id="monthly" />
              Monthly cycles
            </Label>
          </RadioGroup>
        </GalleryCard>

        <GalleryCard title="Selection & Feedback" description="Select menus, sliders, pagination, and toggle groups.">
          <Select defaultValue="focus">
            <SelectTrigger className="gallery-select">
              <SelectValue placeholder="Choose preset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="focus">Deep work (50/10)</SelectItem>
              <SelectItem value="flow">Flow loop (40/5)</SelectItem>
              <SelectItem value="studio">Studio day (90/20)</SelectItem>
            </SelectContent>
          </Select>
          <div className="gallery-slider">
            <Label htmlFor="energy">Energy level</Label>
            <Slider
              id="energy"
              value={sliderValue}
              onValueChange={setSliderValue}
              min={0}
              max={100}
            />
            <span className="gallery-slider__value">{sliderValue[0]}%</span>
          </div>
          <Pagination className="gallery-pagination">
            <PaginationContent>
              <PaginationPrevious href="#" />
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationEllipsis />
              <PaginationItem>
                <PaginationLink href="#">8</PaginationLink>
              </PaginationItem>
              <PaginationNext href="#" />
            </PaginationContent>
          </Pagination>
          <ToggleGroup type="single" defaultValue="write" className="gallery-toggle-group">
            <ToggleGroupItem value="plan">Plan</ToggleGroupItem>
            <ToggleGroupItem value="write">Write</ToggleGroupItem>
            <ToggleGroupItem value="review">Review</ToggleGroupItem>
          </ToggleGroup>
        </GalleryCard>

        <GalleryCard title="Layouts & Navigation" description="Accordion, tabs, breadcrumb trails, separators, and resizable panels.">
          <Accordion type="single" collapsible className="gallery-stack">
            <AccordionItem value="transcript">
              <AccordionTrigger>Session transcript</AccordionTrigger>
              <AccordionContent>
                Exportable notes with auto-generated action items from your improvised scenes.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="metrics">
              <AccordionTrigger>Metrics</AccordionTrigger>
              <AccordionContent>
                Track mood, pacing, and rhythm with annotated highlights.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Tabs defaultValue="overview" className="gallery-tabs">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Quick summary of today’s warmups.</TabsContent>
            <TabsContent value="notes">Voice resonance feels grounded. Try slower build-ups.</TabsContent>
            <TabsContent value="stats">Intensity: 78 · Tempo: 92 · Recovery: 65</TabsContent>
          </Tabs>
          <Breadcrumb className="gallery-breadcrumb">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Practice</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Vocal Impro</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Separator />
          <ResizablePanelGroup direction="horizontal" className="gallery-resizable">
            <ResizablePanel defaultSize={55} className="gallery-resizable__panel">
              <h4>Notes</h4>
              <p>Pin key discoveries, highlight tension shifts, or mark clips for review.</p>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} className="gallery-resizable__panel">
              <h4>Bookmarks</h4>
              <p>Breakdowns, breakthroughs, and moments that deserve a callback.</p>
            </ResizablePanel>
          </ResizablePanelGroup>
        </GalleryCard>

        <GalleryCard title="Overlays & Popovers" description="Tooltips, popovers, dropdown menus, and dialogs.">
          <div className="gallery-inline">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>Quick hint with token-aware theming.</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Session summary
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gallery-popover">
                <p>Intensity steady · Breath anchored · Narrative arcs landed.</p>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem>Move to archive</DropdownMenuItem>
                <DropdownMenuItem>Share link</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export session recap</DialogTitle>
                <DialogDescription>Select the format and recipients.</DialogDescription>
              </DialogHeader>
              <div className="gallery-field">
                <Label htmlFor="format">Format</Label>
                <Select defaultValue="pdf">
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Summary</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                    <SelectItem value="notion">Send to Notion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Export</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link" size="sm">
                View practice recipe
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="gallery-hover-card">
              <h4>Warmup Stack</h4>
              <p>Resonance hums → Story seeds → Story + melody layering.</p>
            </HoverCardContent>
          </HoverCard>
        </GalleryCard>

        <GalleryCard title="Data & Content" description="Tables, avatars, scroll areas, and aspect ratios.">
          <div className="gallery-inline">
            <Avatar>
              <AvatarFallback>AV</AvatarFallback>
            </Avatar>
            <div>
              <p className="gallery-avatar__name">Ari Voice</p>
              <p className="gallery-avatar__meta">Lead improviser · 120 sessions</p>
            </div>
          </div>
          <AspectRatio ratio={16 / 9} className="gallery-aspect">
            <div className="gallery-aspect__cover">
              Highlight reel preview
            </div>
          </AspectRatio>
          <ScrollArea className="gallery-scroll">
            <div className="gallery-scroll__content">
              {[...Array(6)].map((_, index) => (
                <p key={index}>🎧 Clip {index + 1}: signature cadence exploration.</p>
              ))}
            </div>
          </ScrollArea>
          <Table className="gallery-table">
            <TableHeader>
              <TableRow>
                <TableHead>Focus</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Character improv</TableCell>
                <TableCell>25 min</TableCell>
                <TableCell>
                  <Badge variant="outline">Completed</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Harmony drills</TableCell>
                <TableCell>15 min</TableCell>
                <TableCell>
                  <Badge variant="secondary">Queued</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </GalleryCard>

        <GalleryCard title="Time & Media" description="Calendar picker, carousel stories, and lightweight charts.">
          <Calendar className="gallery-calendar" mode="single" selected={new Date()} />
          <Carousel className="gallery-carousel">
            <CarouselContent>
              {carouselSlides.map((slide, index) => (
                <CarouselItem key={slide.title}>
                  <div className="gallery-carousel__item">
                    <span className="gallery-carousel__index">{index + 1}</span>
                    <h4>{slide.title}</h4>
                    <p>{slide.description}</p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
          <ChartContainer
            config={chartConfig}
            className="gallery-chart"
          >
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="var(--chart-primary)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--chart-secondary)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </GalleryCard>

        <GalleryCard title="Toggles & Micro-interactions" description="Standalone toggle button plus grouped toggles showcasing state styles.">
          <div className="gallery-inline">
            <Toggle aria-label="Bold">
              Bold
            </Toggle>
            <Toggle variant="outline" size="sm">
              Outline
            </Toggle>
            <Toggle size="lg">Large</Toggle>
          </div>
          <ToggleGroup type="multiple" defaultValue={['live', 'record']} className="gallery-toggle-group">
            <ToggleGroupItem value="live">Live</ToggleGroupItem>
            <ToggleGroupItem value="record">Record</ToggleGroupItem>
            <ToggleGroupItem value="share">Share</ToggleGroupItem>
          </ToggleGroup>
        </GalleryCard>
      </div>
    </section>
  );
}
