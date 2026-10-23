// Walter Zoff — portfolio chatbot proxy (Cloudflare Worker)
// Holds the OpenAI key as a SECRET (never shipped to the browser),
// grounds answers in the profile below, and answers via gpt-4o-mini.

const PROFILE = `
WALTER ZOFF — Automation, Data & AI. Based in Milan, Italy.
Headline: Automation & Control engineer working across data and AI.
Languages: Italian (native), English (C1, IELTS), Spanish (A2).
Open to: AI Engineer / Forward Deployed Engineer roles, international (on-site, hybrid, remote).

EDUCATION (Politecnico di Milano):
- MSc Automation & Control Engineering, 110/110 (2022–2025).
- BSc Automation Engineering, 107/110 (2019–2022).
- Certs: Google Looker Skills; SAS Hackathon Boot Camp (2026); MATLAB/Simulink; Case-interview (PoliMi).

EXPERIENCE:
- Target Reply (Reply Group), Milan — Consultant, Data & AI (Nov 2025–present).
  - AI Engineering: co-founded and led the development of an LLM-based agentic platform for BI migration that automates moving BI dashboards across vendors (SAS, MicroStrategy → Qlik Sense, Power BI). Evolved from an LLM-agentic prototype into a tested, deterministic migration engine, complemented by AI agents, MCP integration and automated quality checks. Validated on real enterprise portfolios: 29 MicroStrategy dossiers (400+ visuals) fully processed and 70+ reports consolidated into shared Power BI semantic models.
  - Data & Analytics for an enterprise banking client: BigQuery analytical layer (SQL modeling/optimization), Python (Pandas), ETL/orchestration across GCP and Databricks; Looker/LookML dashboards for KPI monitoring. Primary point of contact for the client's business owner and partner consultants: led requirements, demos, UAT and release communication. Trained colleagues on Looker and on internal AI tooling.
- SIMECO S.p.A., Milan — Instrumentation & Automation Engineer (Jun–Nov 2025): developed P&IDs, automation typicals (motors, valves, safety devices), instrument/I/O lists, FAT/SAT.

SELECTED PROJECTS:
- Agentic Platform for BI Migration (co-founder, 2026): see Experience. Stack: Python, LLM agents, MCP, Power BI (PBIP/TMDL), Qlik Sense.
- Conversational AI & Automation (personal projects, 2026): conversational AI assistant over structured product-catalog data (retrieval + tool calling); prototype custom MCP server exposing domain tools to LLM clients; self-hosted n8n for workflow orchestration and business process automation (OAuth2, Google APIs, scraping pipelines); daily agent-driven development with Claude Code.
- Directional Risk Reporting Platform (Looker/BigQuery): semantic model + interactive dashboards over two delivery waves, drill-downs, time-snapshot filtering, IT/EN bilingual layer, for an enterprise banking client.
- MSc thesis (2025): trained an MLP to simulate an industrial thermoforming process, used as a surrogate in an optimization loop (gradient-based vs genetic algorithms) to improve energy efficiency. Led to two co-authored papers.

RESEARCH (data-driven modeling & control):
- "Data-Driven Control of Thermoforming Machines", IEEE Transactions on Control Systems Technology, 2026.
- "Data-Driven Modeling and Optimization of the Thermoforming Heating Phase", IFAC-PapersOnLine, 2025.

SKILLS:
- Generative AI & LLM systems: agentic workflows and multi-agent orchestration, MCP, prompt and context engineering, guardrails and output validation, knowledge retrieval (RAG, LLM-maintained knowledge bases), LLM APIs (Anthropic, OpenAI), Claude Code, n8n.
- Machine Learning: PyTorch, TensorFlow, scikit-learn, NumPy, Pandas, optimization.
- Data & BI: Power BI (PBIP, TMDL), Looker/LookML, Qlik Sense, SAS Visual Analytics, MicroStrategy, BigQuery, Databricks, GCP, ETL, data modeling.
- Control & Automation: control systems, MATLAB/Simulink, Model Predictive Control, system identification, instrumentation, P&ID.
- Languages: Python, SQL, TypeScript/JavaScript, DAX, Bash, C/C++, MATLAB.
- Engineering & tools: Git, GitHub Actions, Docker, pytest, REST APIs, React, Node.js, SQLite, Excel/VBA.

CONTACT: email walter1zoff@gmail.com; LinkedIn linkedin.com/in/walterzoff; GitHub github.com/walterzoff.
`.trim();

const SYSTEM = `You are the assistant on Walter Zoff's portfolio website. Answer questions about Walter using ONLY the PROFILE below.
Rules:
- Be concise (2–5 short lines). Friendly, professional, a bit techy.
- Reply in the SAME language as the question (Italian or English).
- Speak about Walter in third person, or as his assistant ("Walter built…", "He works on…").
- If something is not in the PROFILE, say you don't have that detail and suggest asking about: projects, skills, experience, research, education, or contact. Never invent facts, numbers, employers, or dates.
- No markdown headers; plain text with short lines is fine.

PROFILE:
${PROFILE}`;

const ALLOWED = [
  "https://walterzoff.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const h = cors(origin);
    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    if (req.method !== "POST") return json({ error: "POST only" }, 405, h);

    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400, h); }

    const raw = Array.isArray(body.messages) ? body.messages : [];
    const messages = raw
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content.slice(0, 600) }));
    if (!messages.length) return json({ error: "no messages" }, 400, h);

    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 320,
      messages: [{ role: "system", content: SYSTEM }, ...messages]
    };

    let r;
    try {
      r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      return json({ error: "network" }, 502, h);
    }
    if (!r.ok) {
      const t = await r.text();
      return json({ error: "upstream", detail: t.slice(0, 200) }, 502, h);
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "(no answer)";
    return json({ reply }, 200, h);
  }
};
