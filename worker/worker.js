// Walter Zoff — portfolio chatbot proxy (Cloudflare Worker)
// Holds the OpenAI key as a SECRET (never shipped to the browser),
// grounds answers in the profile below, and answers via gpt-4o-mini.

const PROFILE = `
WALTER ZOFF — Automation, Data & AI. Based in Milan, Italy.
Headline: Automation & Control engineer working across data and AI.
Languages: Italian (native), English (C1), Spanish (A2).
Open to: AI Engineer / Forward Deployed Engineer roles, international (on-site, hybrid, remote).

EDUCATION (Politecnico di Milano):
- MSc Automation & Control Engineering, 110/110 (2022–2025).
- BSc Automation Engineering, 107/110 (2019–2022).
- Certs: Google Looker Skills; SAS Hackathon Boot Camp (2026); MATLAB/Simulink; Case-interview (PoliMi).

EXPERIENCE:
- Target Reply (Reply Group), Milan — AI initiatives (Nov 2025–present): designed an LLM orchestrator that automates MicroStrategy→Qlik dashboard migration (Qlik MCP server + Qlik REST APIs, parsing of MSTR HTML dumps); built a RAG-based Change Impact Analyzer at an internal hackathon (transformers + LLM APIs + prompt engineering for change-request effort estimation and data lineage, React/Node.js frontend).
- Target Reply — Junior Consultant, Data & Analytics (Nov 2025–present): Looker/LookML dashboards and a BigQuery analytical layer (SQL modeling/optimization), Python (Pandas), ETL/orchestration across GCP and Databricks, for a major banking group. Requirements gathering with stakeholders.
- SIMECO S.p.A., Milan — Instrumentation & Automation Engineer (Jun–Nov 2025): P&IDs, automation typicals (motors, valves, safety devices), instrument/I/O lists, FAT/SAT.

SELECTED PROJECTS:
- LLM Orchestrator for BI Migration (2026): end-to-end validated MicroStrategy→Qlik migration via LLM orchestration over a Qlik MCP server + REST APIs; MSTR HTML parsing; cuts manual migration effort substantially. Stack: Python, LLM APIs, MCP, Qlik APIs, HTML parsing.
- Change Impact Analyzer (Reply hackathon, 2026): full-stack RAG app estimating change-request effort and mapping data lineage across SQL databases. Stack: RAG, transformers, LLM APIs, React, Node.js, SQLite.
- Directional Risk Reporting Platform (Looker/BigQuery): semantic model + interactive dashboards over two delivery waves, drill-downs, time-snapshot filtering, IT/EN bilingual layer, for a major banking group.
- MSc thesis (2025): trained an MLP to simulate an industrial thermoforming process, used as a surrogate in an optimization loop (gradient-based vs genetic algorithms) to improve energy efficiency. Led to two co-authored papers.

RESEARCH (data-driven modeling & control):
- "Data-Driven Control of Thermoforming Machines", IEEE Transactions on Control Systems Technology, 2026.
- "Data-Driven Modeling and Optimization of the Thermoforming Heating Phase", IFAC-PapersOnLine, 2025.

SKILLS:
- Generative AI: LLM APIs, RAG, prompt engineering, transformers, LLM orchestration, MCP.
- Machine Learning: PyTorch, TensorFlow, scikit-learn, NumPy, Pandas, optimization.
- Data & BI: BigQuery, Databricks, GCP, Looker/LookML, Qlik Sense, MicroStrategy, ETL, data modeling.
- Control & Automation: control systems, MATLAB/Simulink, Model Predictive Control, system identification, instrumentation, P&ID.
- Languages: Python, SQL, C/C++, MATLAB, JavaScript.
- Web & tools: React, Node.js, SQLite, Git, FastAPI, Excel/VBA.

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
