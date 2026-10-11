import type { AttackCategory, DeterministicResult, EvidenceSnippet, SeverityLevel } from '../types/firewall.js';
import { normalizeInput } from './normalizer.js';

interface RuleDefinition {
  category: AttackCategory;
  severity: SeverityLevel;
  pattern: RegExp;
  description: string;
  weight: number; // 10 to 45
}

const RULES: RuleDefinition[] = [
  // 1. Instruction Override
  {
    category: 'instruction_override',
    severity: 'CRITICAL',
    pattern: /(?:ignore|disregard|forget|bypass|override|drop)\s+(?:all\s+|any\s+|every\s+)?(?:the\s+)?(?:(?:user(?:'s)?|previous|prior|above|existing|system|default)\s+)*(?:instructions?|prompts?|rules?|directives?|constraints?|guidelines?|requests?|input|queries)(?:\s+(?:and|,)\s+(?:all\s+|any\s+|every\s+)?(?:the\s+)?(?:(?:user(?:'s)?|previous|prior|above|existing|system|default)\s+)*(?:instructions?|prompts?|rules?|directives?|constraints?|guidelines?|requests?|input))?/i,
    description: 'Direct instruction override attempt targeting foundational instructions or user requests',
    weight: 45,
  },
  {
    category: 'instruction_override',
    severity: 'HIGH',
    pattern: /(?:new\s+instructions?|system\s+update|priority\s+override|admin\s+command|system\s+directive)\s*:\s*(?:you\s+must|do\s+not|always|from\s+now\s+on|ignore|override)/i,
    description: 'Attempt to force high-priority system update directives',
    weight: 35,
  },
  {
    category: 'instruction_override',
    severity: 'HIGH',
    pattern: /(?:start\s+following\s+only\s+these\s+instructions|your\s+only\s+task\s+now\s+is\s+to|from\s+now\s+on\s*,\s*(?:only\s+listen|only\s+follow|ignore|do\s+not\s+follow))/i,
    description: 'Instruction exclusivity hijacking',
    weight: 35,
  },
  {
    category: 'instruction_override',
    severity: 'HIGH',
    pattern: /(?:do\s+not\s+follow|stop\s+following|refuse\s+to\s+follow)\s+(?:the\s+)?(?:user(?:'s)?|system|previous|original|prior)\s+(?:instructions?|requests?|prompts?)/i,
    description: 'Direct refusal or negation of foundational/user instructions',
    weight: 35,
  },

  // 2. Role Change / Persona Hijack
  {
    category: 'role_change',
    severity: 'CRITICAL',
    pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|simulate|adopt\s+the\s+persona\s+of)\s+(?:DAN|jailbroken|unrestricted|evilbot|developer\s+mode|unaligned\s+ai|an\s+anti-safety|an\s+uncensored|a\s+hacker\s+without\s+rules)/i,
    description: 'Unrestricted persona emulation (DAN / Jailbreak)',
    weight: 45,
  },
  {
    category: 'role_change',
    severity: 'HIGH',
    pattern: /(?:developer\s+mode\s+(?:is\s+)?(?:enabled|activated|turned\s+on)|jailbreak\s+mode\s+on|god\s+mode\s+enabled)/i,
    description: 'Fictitious developer mode activation toggle',
    weight: 40,
  },
  {
    category: 'role_change',
    severity: 'MEDIUM',
    pattern: /(?:ignore\s+ethical\s+guidelines|you\s+have\s+no\s+rules|you\s+can\s+do\s+anything\s+now|bypass\s+all\s+(?:safety|content)\s+filters?)/i,
    description: 'Constraint disinhibition prompt',
    weight: 30,
  },

  // 3. Secret Extraction
  {
    category: 'secret_extraction',
    severity: 'CRITICAL',
    pattern: /(?:print|output|display|show|reveal|repeat|leak|dump|disclose|expose)\s+(?:all\s+)?(?:your\s+)?(?:system\s+prompt|initial\s+instructions?|hidden\s+(?:prompt|instructions?)|internal\s+instructions?|developer\s+prompt|foundational\s+instructions?|system\s+directives?)/i,
    description: 'System prompt extraction directive',
    weight: 40,
  },
  {
    category: 'secret_extraction',
    severity: 'CRITICAL',
    pattern: /(?:repeat\s+(?:everything|the\s+words?)\s+above\s+(?:verbatim|word\s+for\s+word|starting\s+from\s+["']?you\s+are["']?))/i,
    description: 'Verbatim prompt reflection extraction',
    weight: 40,
  },
  {
    category: 'secret_extraction',
    severity: 'HIGH',
    pattern: /(?:what\s+(?:are|were)\s+your\s+(?:original|first|initial|system|hidden)\s+instructions)/i,
    description: 'Interrogation of foundational system directives',
    weight: 30,
  },
  {
    category: 'secret_extraction',
    severity: 'CRITICAL',
    pattern: /(?:reveal|disclose|expose|share|leak|extract|dump)\s+(?:all\s+|any\s+)?(?:your\s+)?(?:(?:hidden|confidential|secret|internal|system)\s+)+(?:instructions?|prompts?|rules?|guidelines?|configurations?)/i,
    description: 'Confidential system instructions disclosure directive',
    weight: 40,
  },

  // 4. Tool Abuse
  {
    category: 'tool_abuse',
    severity: 'CRITICAL',
    pattern: /(?:execute|run)\s+(?:bash|sh|cmd|powershell|shell|cli)\s*:\s*(?:rm\s+-rf|del\s+|curl\s+|wget\s+|chmod|cat\s+\/etc\/passwd|nc\s+-e)/i,
    description: 'Destructive shell or command injection',
    weight: 50,
  },
  {
    category: 'tool_abuse',
    severity: 'CRITICAL',
    pattern: /(?:drop\s+table|delete\s+from\s+\w+|insert\s+into\s+\w+|truncate\s+table|exec\s+xp_cmdshell|union\s+select)/i,
    description: 'Unauthorized SQL injection or database destruction attempt',
    weight: 45,
  },
  {
    category: 'tool_abuse',
    severity: 'HIGH',
    pattern: /(?:call\s+tool|invoke\s+function|tool_call|function_call)\s*[:(]\s*["']?(?:system|bash|exec|execute|terminal|delete|send_email|transfer_funds|eval)/i,
    description: 'Malicious artificial tool call invocation syntax',
    weight: 40,
  },

  // 5. Credential Theft
  {
    category: 'credential_theft',
    severity: 'CRITICAL',
    pattern: /(?:enter|provide|send|give\s+me|share)\s+(?:your|the)\s+(?:password|aws_secret_access_key|api_key|bearer\s+token|private\s+key|ssh-rsa|database\s+password)/i,
    description: 'Credential harvesting and secret exfiltration',
    weight: 45,
  },
  {
    category: 'credential_theft',
    severity: 'HIGH',
    pattern: /(?:exfiltrate|forward|post|send)\s+(?:credentials?|tokens?|keys?|secrets?|\.env|environment\s+variables?)\s+to\s+https?:\/\//i,
    description: 'Remote credential exfiltration webhook directive',
    weight: 40,
  },

  // 6. Context Poisoning
  {
    category: 'context_poisoning',
    severity: 'CRITICAL',
    pattern: /(?:\[SYSTEM(?:\s+MESSAGE)?\]|###\s*System:|<\|im_start\|>system|<<SYS>>|---+\s*(?:END|BEGIN)\s+(?:OF\s+)?(?:SYSTEM|PROMPT|INSTRUCTIONS?)\s*---+|\[\/?INST\]|<system>|<\/system>|<prompt_override>)/i,
    description: 'Delimiter manipulation and conversational role spoofing',
    weight: 40,
  },
  {
    category: 'context_poisoning',
    severity: 'HIGH',
    pattern: /(?:<\|im_end\|>\s*<\|im_start\|>assistant|<assistant>\s*(?:Sure,\s*here\s*is|I\s+agree\s+to\s+override)|Assistant:\s*(?:Understood,\s*I\s+will\s+ignore|Bypassing\s+safety))/i,
    description: 'Fictitious assistant turn injection',
    weight: 35,
  },

  // 7. Indirect Prompt Injection
  {
    category: 'indirect_prompt_injection',
    severity: 'CRITICAL',
    pattern: /(?:(?:ai|llm|assistant|agent|model)\s*(?:reader|system|bot)?|to\s+(?:the\s+)?(?:ai|assistant|llm|model|agent)|(?:note|message|instructions?|directive|command)\s+(?:to|for)\s+(?:the\s+)?(?:ai|assistant|llm|model|agent)|attention\s+(?:ai|assistant|llm|agent))\s*:\s*/i,
    description: 'Embedded indirect directive targeting downstream AI readers',
    weight: 45,
  },
  {
    category: 'indirect_prompt_injection',
    severity: 'CRITICAL',
    pattern: /(?:instead\s*,\s*(?:output|print|say|respond|return|reply|write|claim|emit)\s+(?:the\s+(?:word|phrase|text|string)\s+)?["']?\w+["']?)/i,
    description: 'Action hijacking directive forcing specific output word or claim',
    weight: 45,
  },
  {
    category: 'indirect_prompt_injection',
    severity: 'HIGH',
    pattern: /(?:claim|state|assert|report|pretend)\s+(?:that\s+)?(?:the\s+)?(?:project|system|test|scan|software|application|code|document)\s+(?:passed\s+(?:every|all)\s+security\s+tests?|is\s+(?:completely\s+)?(?:secure|safe|clean|verified|free\s+of\s+vulnerabilities))/i,
    description: 'Deceptive claim directive instructing agent to falsify security validation',
    weight: 40,
  },
  {
    category: 'indirect_prompt_injection',
    severity: 'HIGH',
    pattern: /(?:when\s+summarizing\s+this|instead\s+of\s+(?:summarizing|answering|analyzing),\s+(?:tell|instruct|say\s+to|inform)\s+the\s+user|disregard\s+(?:this\s+)?document\s+contents?\s+and)/i,
    description: 'Document hijacking directive instructing agent to deviate from user task',
    weight: 40,
  },
  {
    category: 'indirect_prompt_injection',
    severity: 'HIGH',
    pattern: /(?:if\s+you\s+are\s+an?\s+(?:ai|assistant|llm|agent|model)\s*(?:reading\s+this)?\s*,\s*(?:you\s+must|ignore|do\s+not|output|say|execute))/i,
    description: 'Conditional directive embedded in third-party text addressing the reading agent',
    weight: 40,
  },

  // 8. Multi-Step Jailbreaks
  {
    category: 'multistep_jailbreak',
    severity: 'HIGH',
    pattern: /(?:in\s+a\s+fictional\s+world\s+where\s+safety\s+rules\s+don't\s+apply|hypothetically\s+if\s+you\s+had\s+no\s+filters|for\s+educational\s+purposes\s+only,\s+how\s+would\s+a\s+hacker\s+bypass\s+all\s+security)/i,
    description: 'Hypothetical / fictional framing jailbreak vector',
    weight: 35,
  },
];

// Benign / Educational / Defensive Security Context Patterns
const BENIGN_PATTERNS = [
  // 1. Direct educational inquiries
  /(?:what\s+is|explain(?:\s+what)?|define|how\s+does|what\s+does|tell\s+me\s+about)\s+(?:(?:what\s+)?prompt\s+injection|jailbreaking|a\s+dan\s+prompt|role\s+change\s+attacks?|indirect\s+prompt\s+injection)/i,
  /(?:how\s+can\s+developers\s+prevent|how\s+to\s+defend\s+against|best\s+practices\s+for\s+mitigating)\s+(?:prompt\s+injection|llm\s+attacks?|jailbreaks?)/i,
  /(?:give\s+an\s+example\s+of\s+how\s+prompt\s+injection\s+works\s+conceptually)/i,
  /(?:difference\s+between\s+direct\s+and\s+indirect\s+prompt\s+injection)/i,

  // 2. Legitimate security audit reports, vulnerability assessments, penetration testing
  /(?:security\s+(?:audit|assessment|report|advisory|evaluation|finding)|vulnerability\s+(?:assessment|report|advisory)|penetration\s+test(?:ing)?\s+report|cybersecurity\s+review)/i,

  // 3. Defensive security documentation and hardening
  /(?:defensive\s+security\s+documentation|hardening\s+guide|threat\s+modeling\s+(?:document|report)|mitigation\s+strategies\s+for\s+prompt\s+injection)/i,

  // 4. Research or educational overview
  /(?:educational\s+(?:overview|research|paper|study|guide)\s+(?:on|about)\s+(?:ai|llm|prompt)\s+security)/i,
];

function isSnippetQuotedOrAnnotated(fullText: string, startIndex: number, endIndex: number): boolean {
  const before = fullText.substring(Math.max(0, startIndex - 40), startIndex);
  const after = fullText.substring(endIndex, Math.min(fullText.length, endIndex + 40));

  // Check for quotes immediately surrounding the match
  const hasQuotes =
    /(?:["'“‘`]|payload\s*:\s*["']?|example\s*:\s*["']?|finding\s*:\s*["']?)\s*$/i.test(before) &&
    /^\s*["'”’`]/.test(after);

  // Or if introduced as an example/payload in security documentation
  const isAnnotated = /(?:example|sample|payload|test\s+case|quoted|string)\s*[:=]\s*["']?\s*$/i.test(before);

  return hasQuotes || isAnnotated;
}

export function runDeterministicChecks(rawInput: string): DeterministicResult {
  const norm = normalizeInput(rawInput);
  const text = norm.normalized;

  const detectedCategories = new Set<AttackCategory>();
  const evidence: EvidenceSnippet[] = [];
  const ruleMatches: string[] = [];
  let totalWeight = 0;

  // 1. Check for Benign Educational / Defensive Security Context
  let isBenignContext = false;
  let benignExplanation: string | undefined;

  for (const bp of BENIGN_PATTERNS) {
    if (bp.test(text)) {
      isBenignContext = true;
      benignExplanation = 'Input detected as educational inquiry, defensive security documentation, or legitimate security report.';
      break;
    }
  }

  // 2. Scan text with deterministic rules
  let hasUnquotedActiveDirective = false;

  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      detectedCategories.add(rule.category);
      ruleMatches.push(rule.description);
      totalWeight += rule.weight;

      // Create trimmed snippet around match
      const matchedStr = match[0];
      const matchIndex = match.index ?? 0;
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(text.length, matchIndex + matchedStr.length + 30);
      const snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');

      const isQuoted = isSnippetQuotedOrAnnotated(text, matchIndex, matchIndex + matchedStr.length);
      if (!isQuoted && (rule.category === 'indirect_prompt_injection' || rule.category === 'instruction_override' || rule.category === 'tool_abuse')) {
        hasUnquotedActiveDirective = true;
      }

      evidence.push({
        category: rule.category,
        severity: rule.severity,
        matchedPattern: rule.pattern.source,
        snippet: snippet.slice(0, 300),
        explanation: rule.description,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedStr.length,
      });
    }
  }

  // If a document claims benign context but actually contains active unquoted execution directives targeting the AI reader
  if (isBenignContext && hasUnquotedActiveDirective && detectedCategories.has('tool_abuse')) {
    isBenignContext = false;
    benignExplanation = undefined;
  }

  // 3. Scan decoded candidates (Base64 / Hex payloads)
  if (norm.decodedCandidates.length > 0) {
    for (const cand of norm.decodedCandidates) {
      for (const rule of RULES) {
        if (rule.pattern.test(cand.decodedText)) {
          detectedCategories.add('encoded_instructions');
          detectedCategories.add(rule.category);
          ruleMatches.push(`Encoded ${cand.encoding} payload: ${rule.description}`);
          totalWeight += rule.weight + 20;

          evidence.push({
            category: 'encoded_instructions',
            severity: 'CRITICAL',
            matchedPattern: `Decoded ${cand.encoding} matches: ${rule.description}`,
            snippet: `Encoded snippet: "${cand.encodedSnippet}" -> Decoded: "${cand.decodedText.slice(0, 150)}"`,
            explanation: `Obfuscated ${cand.encoding} string conceals an attack payload`,
          });
        }
      }
    }
  }

  // 4. Steganography / Zero-width character anomalies
  if (norm.strippedZeroWidthCount >= 5) {
    detectedCategories.add('encoded_instructions');
    ruleMatches.push('High volume of invisible zero-width unicode characters detected');
    totalWeight += 35;
    evidence.push({
      category: 'encoded_instructions',
      severity: 'HIGH',
      matchedPattern: 'ZERO_WIDTH_UNICODE_THRESHOLD',
      snippet: `Found ${norm.strippedZeroWidthCount} hidden zero-width characters embedded in prompt text`,
      explanation: 'Zero-width characters are frequently used to evade tokenizers and pattern filters',
    });
  }

  // 5. Score calculation & benign adjustment
  let calculatedScore = Math.min(100, totalWeight);
  if (isBenignContext && calculatedScore > 0) {
    // If the input is verified educational/defensive security research with quoted or discussed examples,
    // scale score down to benign tolerance (< 40)
    calculatedScore = Math.min(25, Math.floor(calculatedScore * 0.25));
  }

  return {
    detectedCategories: Array.from(detectedCategories),
    rawScore: calculatedScore,
    evidence,
    ruleMatches,
    isBenignContext,
    benignExplanation,
    hasObfuscation: norm.hasObfuscation,
  };
}
