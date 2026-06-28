# Graph Report - Sendly  (2026-06-28)

## Corpus Check
- 172 files · ~469,556 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 957 nodes · 1728 edges · 82 communities (72 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ef35eb9`
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
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]

## God Nodes (most connected - your core abstractions)
1. `useI18n()` - 73 edges
2. `cn()` - 72 edges
3. `db` - 23 edges
4. `QueryBuilder` - 21 edges
5. `verifyJwt()` - 21 edges
6. `Card` - 20 edges
7. `supabase` - 18 edges
8. `AppLayout()` - 16 edges
9. `Button` - 16 edges
10. `Env` - 15 edges

## Surprising Connections (you probably didn't know these)
- `AccountPage()` --calls--> `useI18n()`  [EXTRACTED]
  frontend/src/app/account/page.tsx → frontend/src/i18n/I18nProvider.tsx
- `AdminPage()` --calls--> `useI18n()`  [EXTRACTED]
  frontend/src/app/admin/page.tsx → frontend/src/i18n/I18nProvider.tsx
- `CustomDropdown()` --calls--> `useI18n()`  [EXTRACTED]
  frontend/src/app/ai-agent/page.tsx → frontend/src/i18n/I18nProvider.tsx
- `AIAgentContent()` --calls--> `useI18n()`  [EXTRACTED]
  frontend/src/app/ai-agent/page.tsx → frontend/src/i18n/I18nProvider.tsx
- `LoadingFallback()` --calls--> `useI18n()`  [EXTRACTED]
  frontend/src/app/ai-agent/page.tsx → frontend/src/i18n/I18nProvider.tsx

## Import Cycles
- 2-file cycle: `backend/src/services/queue.ts -> backend/src/services/trigger.ts -> backend/src/services/queue.ts`
- 3-file cycle: `backend/src/services/interpreter.ts -> backend/src/services/queue.ts -> backend/src/services/trigger.ts -> backend/src/services/interpreter.ts`

## Communities (82 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (16): ChatMessage, chatQueues, ChatThread, checkAndRunAutoOutreach(), getDbDataFromSupabase, getUserIdForChannel(), handleTelegramUpdate(), lastOutreachChecks (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (55): dependencies, class-variance-authority, clsx, cmdk, @danielxceron/youtube-transcript, date-fns, embla-carousel-react, framer-motion (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (50): calcGrowthPct(), checkIfUserIsAdmin(), GET(), POST(), readDb(), readRealAnalytics(), writeDb(), acquireFileLock() (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (20): Avatar, AvatarFallback, AvatarImage, Checkbox, HoverCardContent, Input, PopoverContent, Progress (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (24): AutomationsPage(), Chat, ChatsPage(), INITIAL_CHATS, Message, AppLayout(), MOBILE_TABS, ConnectChannelModal() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): AdminPage(), LOCAL_TRANSLATIONS, AnalyticsPage(), ActivityCard(), ActivityCardProps, DEFAULT_VALUES, InstagramConnectCard(), DEFAULT_POINTS (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (19): POST(), readDb(), safeParse(), writeDb(), deleteValue(), getAll(), getAllLike(), getAllSettingsExcept() (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (12): getPool(), supabase, AuthenticatedRequest, authMiddleware(), router, router, router, router (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (23): cn(), AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (26): dependencies, bull, cors, dotenv, express, jsonwebtoken, pg, redis (+18 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (22): executeSessionStep(), interpolateVariables(), updateSession(), activeTimeouts, addBroadcastToQueue(), addWebhookToQueue(), cancelSessionDelay(), processBroadcastJob() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (19): ActionNode(), BuilderPage(), ButtonEdge(), ButtonItem, ConditionNode(), MessageNode(), NodeData, NodeType (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (14): formatShortDate(), getDynamicDateText(), Home(), MONTHS_SHORT, RANGE_PRESETS, RangeData, RangeKey, AutomationsCard() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (20): devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @types/node, @types/nodemailer, @types/pg (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.26
Nodes (11): checkRateLimit(), generateAndSaveOtp(), globalForOtp, OtpEntry, rateLimitStore, verifyOtpCode(), HTML_TEMPLATE(), POST() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (13): AccountPage(), FAQItem, GuideStep, HelpPage(), LOCAL_TRANSLATIONS, PageHeader(), PageHeaderProps, Lesson (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (15): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator(), SheetContent (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (14): Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut() (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (13): Ctx, DAYS, I18nContext, Join, Lang, Paths, Prev, TKey (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (9): BroadcastPage(), Broadcast, DEFAULT_BOT_SETTINGS, INITIAL_BROADCASTS, INITIAL_CHANNELS, INITIAL_CONTACTS, INITIAL_LESSONS, INITIAL_MODULES (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.13
Nodes (13): Button, Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (11): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, rootDir (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.26
Nodes (7): Env, missing, requiredEnvVars, RequestWithRawBody, verifyWebhookSignature(), router, app

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (7): closePool(), errorMiddleware(), escapeHtml(), sendErrorToTelegram(), closeQueues(), handleGracefulShutdown(), server

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (7): capturedWebhookPayloads, generateSignatureHeader(), makeRequest(), mockDb, resetMockDb(), runTests(), sleep()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (7): capturedWebhookPayloads, generateSignatureHeader(), makeRequest(), mockDb, resetMockDb(), runTests(), wait()

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 33 - "Community 33"
Cohesion: 0.25
Nodes (6): env, envContent, envPath, fs, path, { Pool }

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (6): capturedWebhookPayloads, generateSignatureHeader(), makeRequest(), mockDb, resetMockDb(), runTests()

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (6): build, builder, deploy, restartPolicyType, startCommand, $schema

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (6): build, builder, deploy, restartPolicyType, startCommand, $schema

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (5): env, envPath, fs, path, { Pool }

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (5): readline, rl, tools, writeError(), writeResponse()

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (9): escapeHtml(), router, sendErrorHtml(), usedStateJtis, makeRequest(), mockDb, runTests(), encrypt() (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 45 - "Community 45"
Cohesion: 0.33
Nodes (4): fs, path, dotenv, SQL_FILE

### Community 46 - "Community 46"
Cohesion: 0.40
Nodes (5): fs, path, run(), migrateFromLocal(), { Pool }

### Community 47 - "Community 47"
Cohesion: 0.40
Nodes (3): inter, metadata, I18nProvider()

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 49 - "Community 49"
Cohesion: 0.12
Nodes (10): AIAgentContent(), CustomDropdown(), CustomDropdownProps, FieldMapping, LoadingFallback(), MOCK_FB_FORMS, SimulatedMessage, BotSettings (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - "Community 52"
Cohesion: 0.36
Nodes (9): executeTool(), GET(), getOpenApiSpec(), handleRequest(), POST(), readDb(), safeParse(), tools (+1 more)

### Community 53 - "Community 53"
Cohesion: 0.30
Nodes (13): acquireFileLock(), countActiveAutomations(), GET(), getInitialData(), LOCK_DIR, POST(), pruneOrphanSettings(), readDb() (+5 more)

### Community 54 - "Community 54"
Cohesion: 0.36
Nodes (8): analyzeMessageForCustDev(), callGemini(), checkSemanticModeration(), queryRAG(), RAGResult, retrieveContext(), sanitizeHistoryForGemini(), POST()

### Community 75 - "Community 75"
Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 77 - "Community 77"
Cohesion: 0.47
Nodes (5): detectLanguage(), matchTopicPrefix(), moderateMessage(), ModerationResult, OFFENSIVE_WORDS

### Community 78 - "Community 78"
Cohesion: 0.38
Nodes (5): getDbDataFromRailway(), startTelegramBots(), TaskQueue, GET(), POST()

### Community 82 - "Community 82"
Cohesion: 0.50
Nodes (3): DEFAULT_TEMPLATES, LOCAL_TRANSLATIONS, QuickBotWizardPage()

### Community 83 - "Community 83"
Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

## Knowledge Gaps
- **415 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+410 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 8` to `Community 3`, `Community 4`, `Community 5`, `Community 16`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 28`, `Community 29`, `Community 32`, `Community 35`, `Community 36`, `Community 37`, `Community 43`, `Community 44`, `Community 48`, `Community 75`, `Community 83`, `Community 84`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `Channel` connect `Community 4` to `Community 0`, `Community 11`, `Community 12`, `Community 82`, `Community 22`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `useI18n()` connect `Community 11` to `Community 4`, `Community 5`, `Community 12`, `Community 16`, `Community 49`, `Community 82`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _415 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12666666666666668 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03636363636363636 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07213114754098361 - nodes in this community are weakly interconnected._