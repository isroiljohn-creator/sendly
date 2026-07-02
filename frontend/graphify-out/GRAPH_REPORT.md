# Graph Report - frontend  (2026-07-02)

## Corpus Check
- 160 files · ~465,573 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 897 nodes · 1651 edges · 67 communities (61 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b233b4f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 67|Community 67]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 72 edges
2. `useI18n()` - 71 edges
3. `verifyJwt()` - 35 edges
4. `executeGeminiCall()` - 23 edges
5. `db` - 22 edges
6. `getPool()` - 21 edges
7. `Card` - 20 edges
8. `initDb()` - 18 edges
9. `compilerOptions` - 17 edges
10. `Button` - 16 edges

## Surprising Connections (you probably didn't know these)
- `runGuardrailsTests()` --calls--> `checkRateLimit()`  [EXTRACTED]
  scripts/test-guardrails.ts → src/lib/rateLimiter.ts
- `setupTestDb()` --calls--> `getPool()`  [EXTRACTED]
  scripts/test-billing.ts → src/lib/pgdb.ts
- `setupTestDb()` --calls--> `initDb()`  [EXTRACTED]
  scripts/test-billing.ts → src/lib/pgdb.ts
- `runTests()` --calls--> `deductCredits()`  [EXTRACTED]
  scripts/test-billing.ts → src/lib/billing.ts
- `runTests()` --calls--> `grantPlanCredits()`  [EXTRACTED]
  scripts/test-billing.ts → src/lib/billing.ts

## Import Cycles
- None detected.

## Communities (67 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (51): executeGeminiCall(), executeWithRetriesAndFallback(), GeminiCallResult, getOperationConfig(), logCostTelemetryAsync(), makeRawGeminiApiCall(), ModelRoute, analyzeMessageForCustDev() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (56): dependencies, bcryptjs, class-variance-authority, clsx, cmdk, @danielxceron/youtube-transcript, date-fns, embla-carousel-react (+48 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (47): calculateKbHash(), getOrBuildContextCache(), Lesson, Module, callGemini(), POST(), readDb(), userExists() (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.25
Nodes (15): acquireFileLock(), ADMIN_EMAILS, countActiveAutomations(), GET(), getInitialData(), LOCK_DIR, POST(), pruneOrphanSettings() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (17): AccordionContent, AccordionItem, AccordionTrigger, Checkbox, HoverCardContent, Input, PopoverContent, Progress (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (20): Chat, ChatFolder, ChatsPage(), DEFAULT_FOLDERS, Message, AppLayout(), PageHeader(), PageHeaderProps (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (38): detectLanguage(), moderateMessage(), ModerationResult, OFFENSIVE_WORDS, checkRateLimit(), rateLimitMap, addTelegramChannelToList(), ChatMessage (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (20): MOBILE_TABS, ConnectChannelModal(), BOTTOM_ITEMS, NavButton(), NavItem, TOP_ITEMS, LANG_FLAGS, LANG_NAMES (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (12): formatShortDate(), getDynamicDateText(), Home(), MONTHS_SHORT, RANGE_PRESETS, RangeData, RangeKey, AutomationsCard() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (22): devDependencies, eslint, eslint-config-next, postcss, tailwindcss, tsx, @types/bcryptjs, @types/node (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (24): cn(), AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (18): AutomationsPage(), ActionNode(), BuilderPage(), ButtonEdge(), ButtonItem, ConditionNode(), MessageNode(), NodeData (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (27): AdminPage(), LOCAL_TRANSLATIONS, AnalyticsPage(), RangeKey, ActivityCard(), ActivityCardProps, DEFAULT_VALUES, InstagramConnectCard() (+19 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (17): AIAgentContent(), CustomDropdown(), CustomDropdownProps, FieldMapping, LoadingFallback(), MOCK_FB_FORMS, SimulatedMessage, BotSettings (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (14): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+6 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.10
Nodes (17): FAQItem, GuideStep, HelpPage(), LOCAL_TRANSLATIONS, Ctx, DAYS, I18nContext, Join (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (20): findUserByEmail(), POST(), readDb(), base64url(), signJwt(), checkOtpIpLimit(), checkRateLimit(), generateAndSaveOtp() (+12 more)

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (11): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (7): inter, translations, I18nProvider(), CookieConsent(), ErrorTrackerInitializer(), Toaster(), ToasterProps

### Community 22 - "Community 22"
Cohesion: 0.30
Nodes (11): acquireFileLock(), ChatMessage, ChatThread, LOCK_DIR, POST(), readDb(), readDbUnlocked(), releaseFileLock() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.47
Nodes (7): calcGrowthPct(), checkIfUserIsAdmin(), GET(), POST(), readDb(), readRealAnalytics(), writeDb()

### Community 24 - "Community 24"
Cohesion: 0.32
Nodes (6): fs, getTelegramAvatarBase64(), path, { Pool }, run(), safeParse()

### Community 25 - "Community 25"
Cohesion: 0.36
Nodes (9): executeTool(), GET(), getOpenApiSpec(), handleRequest(), POST(), readDb(), safeParse(), tools (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): extends, rules, @next/next/no-img-element, prefer-const, react-hooks/exhaustive-deps, react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): getPercentile(), runEvaluation(), TEST_PROMPTS

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (4): POST(), readDb(), sendTelegramMessage(), writeDb()

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (6): env, envContent, envPath, fs, path, { Pool }

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (6): build, builder, deploy, restartPolicyType, startCommand, $schema

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (5): env, envPath, fs, path, { Pool }

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 43 - "Community 43"
Cohesion: 0.70
Nodes (4): POST(), readDb(), safeParse(), writeDb()

### Community 44 - "Community 44"
Cohesion: 0.40
Nodes (5): fs, migrateFromLocal(), path, { Pool }, run()

### Community 45 - "Community 45"
Cohesion: 0.47
Nodes (5): apiRateLimitStore, checkApiRateLimit(), config, isOriginAllowed(), middleware()

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps
- **383 isolated node(s):** `extends`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `react/no-unescaped-entities`, `prefer-const` (+378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 11` to `Community 4`, `Community 5`, `Community 13`, `Community 15`, `Community 16`, `Community 19`, `Community 20`, `Community 26`, `Community 27`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 41`, `Community 42`, `Community 46`, `Community 47`, `Community 50`, `Community 51`, `Community 52`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `Channel` connect `Community 7` to `Community 5`, `Community 6`, `Community 8`, `Community 12`, `Community 14`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `Community 12` to `Community 5`, `Community 7`, `Community 8`, `Community 13`, `Community 14`, `Community 17`, `Community 21`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `extends`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any` to the rest of the system?**
  _383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07191316146540028 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03571428571428571 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08192090395480225 - nodes in this community are weakly interconnected._