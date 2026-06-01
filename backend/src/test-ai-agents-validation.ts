import fs from "fs";
import path from "path";

// Define interface for validation results
interface AgentValidationReport {
  agentType: string;
  hasRoleSection: boolean;
  hasTaskSection: boolean;
  hasRulesSection: boolean;
  hasStyleSection: boolean;
  hasContextPlaceholder: boolean;
  hasEscalationRules: boolean;
  hasForbiddenTopics: boolean;
  languageCleanliness: boolean;
  overallScore: number;
}

function runValidation() {
  console.log("=================================================================");
  console.log("             SENDLY AI AGENT COMPLIANCE & AUDIT REPORT            ");
  console.log("=================================================================");
  
  // Load Uzbek localization file which contains agent configurations
  const localePath = path.join(__dirname, "../../frontend/src/i18n/locales/uz.json");
  if (!fs.existsSync(localePath)) {
    console.error("Error: uz.json file not found at " + localePath);
    process.exit(1);
  }

  const uzLocale = JSON.parse(fs.readFileSync(localePath, "utf-8"));
  const defaults = uzLocale?.pages?.ai_agent?.defaults;

  if (!defaults) {
    console.error("Error: pages.ai_agent.defaults namespace not found in uz.json");
    process.exit(1);
  }

  const agentTypes = Object.keys(defaults);
  const reports: AgentValidationReport[] = [];

  for (const agent of agentTypes) {
    const data = defaults[agent];
    const prompt = data?.prompt || "";
    const rules = data?.rules || {};
    const topics = data?.topics || [];

    // Structural checks
    const hasRole = prompt.includes("# ROL VA IDENTIFIKATSIYA");
    const hasTask = prompt.includes("# ASOSIY VAZIFA");
    const hasRules = prompt.includes("# QAT'IY YO'RIQNOMALAR VA CHEKLOVLAR");
    const hasStyle = prompt.includes("# JAVOB FORMATI VA STILI");
    
    // RAG grounding check
    const hasContext = prompt.includes("{{context}}");
    
    // Config checks
    const hasEscalations = Object.keys(rules).length > 0;
    const hasTopics = topics.length > 0;

    // Typo/Grammar audit ( Uzbek specific checks: correct apostrophe usage e.g. o' or g' )
    const hasIncorrectQuotes = /o[‘`’]/i.test(prompt) || /g[‘`’]/i.test(prompt);
    const languageClean = !hasIncorrectQuotes;

    // Calculate score (out of 100%)
    let score = 0;
    if (hasRole) score += 15;
    if (hasTask) score += 15;
    if (hasRules) score += 15;
    if (hasStyle) score += 15;
    if (hasContext) score += 15;
    if (hasEscalations) score += 10;
    if (hasTopics) score += 10;
    if (languageClean) score += 5;

    reports.push({
      agentType: agent,
      hasRoleSection: hasRole,
      hasTaskSection: hasTask,
      hasRulesSection: hasRules,
      hasStyleSection: hasStyle,
      hasContextPlaceholder: hasContext,
      hasEscalationRules: hasEscalations,
      hasForbiddenTopics: hasTopics,
      languageCleanliness: languageClean,
      overallScore: score,
    });
  }

  // Print Report Table
  console.log(
    String("Agent Type").padEnd(15) + " | " +
    String("Structure").padEnd(10) + " | " +
    String("RAG ({{context}})").padEnd(16) + " | " +
    String("Rules & Topics").padEnd(15) + " | " +
    String("Score (%)")
  );
  console.log("-".repeat(70));

  let totalScore = 0;
  for (const rep of reports) {
    const structureText = (rep.hasRoleSection && rep.hasTaskSection && rep.hasRulesSection && rep.hasStyleSection) ? "PASSED" : "FAILED";
    const ragText = rep.hasContextPlaceholder ? "PASSED" : "FAILED";
    const rulesText = (rep.hasEscalationRules && rep.hasForbiddenTopics) ? "PASSED" : "FAILED";
    
    console.log(
      rep.agentType.padEnd(15) + " | " +
      structureText.padEnd(10) + " | " +
      ragText.padEnd(16) + " | " +
      rulesText.padEnd(15) + " | " +
      `${rep.overallScore}%`
    );
    totalScore += rep.overallScore;
  }

  const averageScore = Math.round(totalScore / reports.length);
  console.log("-".repeat(70));
  console.log(`Average AI Agent Compliance Score: ${averageScore}%\n`);

  console.log("Detailed Agent Analysis & Audits:");
  for (const rep of reports) {
    console.log(`\n• Agent: ${rep.agentType.toUpperCase()}`);
    console.log(`  - Role section present: ${rep.hasRoleSection ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Task section present: ${rep.hasTaskSection ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Forbidden rules present: ${rep.hasRulesSection ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Style section present: ${rep.hasStyleSection ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Grounding placeholder {{context}} present: ${rep.hasContextPlaceholder ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Escalation routing rules defined: ${rep.hasEscalationRules ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Excluded topics configured: ${rep.hasForbiddenTopics ? "✅ Yes" : "❌ No"}`);
    console.log(`  - Uzbek grammar/apostrophe audit: ${rep.languageCleanliness ? "✅ CLEAN" : "⚠️ WARNING (Found incorrect quotes)"}`);
  }
}

runValidation();
