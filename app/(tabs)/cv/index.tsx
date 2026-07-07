import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";
import { useUIStore } from "../../../stores/uiStore";
import { Text } from "../../../components/ui/Text";
import { Button } from "../../../components/ui/Button";
import { GlassCard } from "../../../components/ui/GlassCard";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Toast } from "../../../components/ui/Toast";
import { COLORS } from "../../../constants/theme";
import {
  FileText,
  CheckCircle,
  Clock,
  Eye,
  ShareNetwork,
  ArrowLeft,
  DownloadSimple,
  FilePdf,
  EnvelopeSimple,
  X,
  PaperPlaneRight,
  UploadSimple,
  Sparkle,
  ArrowSquareUpRight,
  MagicWand,
  Lightning,
  Warning,
  Trash,
} from "phosphor-react-native";

// ─────────────────────────────────────────────────────────────────────────────
// CV FORMAT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const CV_FORMATS = [
  {
    key: "uk",
    title: "UK CV",
    subtitle: "United Kingdom",
    description: "2 pages max • No photo • Formal British English",
    color: "#1E3A5F",
    accentColor: "#C9A84C",
    tag: "ATS-Optimised",
    flagCode: "GB",
  },
  {
    key: "usa",
    title: "US Resume",
    subtitle: "USA & Canada",
    description: "1 page • Quantified achievements • Action verbs",
    color: "#B22234",
    accentColor: "#3C3B6E",
    tag: "ATS-Friendly",
    flagCode: "US",
    dbKeys: ["usa", "usa_canada"],
  },
  {
    key: "european",
    title: "Europass CV",
    subtitle: "European Union",
    description: "Standardised • Language matrix • CEFR scale",
    color: "#003399",
    accentColor: "#FFCC00",
    tag: "EU Standard",
    flagCode: "EU",
    dbKeys: ["european", "europass"],
  },
  {
    key: "international",
    title: "International CV",
    subtitle: "UAE, Australia & More",
    description: "2–4 pages • Comprehensive • Global format",
    color: "#1A6B3C",
    accentColor: "#E67E22",
    tag: "Global Format",
    flagCode: "INTL",
  },
];

const IMPORT_MODES = [
  {
    key: "convert",
    label: "Convert Format",
    desc: "Reformat to a different regional style",
    icon: ArrowSquareUpRight,
    color: COLORS.indigo,
  },
  {
    key: "improve",
    label: "AI Improve",
    desc: "Strengthen bullets, add metrics, fix gaps",
    icon: MagicWand,
    color: "#10B981",
  },
  {
    key: "extract",
    label: "Extract to Profile",
    desc: "Fill your profile from this CV automatically",
    icon: Lightning,
    color: COLORS.gold,
  },
];

function normaliseCVStyle(style: string): string {
  if (!style) return "uk";
  if (style === "usa_canada") return "usa";
  if (style === "europass") return "european";
  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS STEPS — one set per mode (FIX: removed single PROGRESS_STEPS const
// that caused "Cannot find name 'PROGRESS_STEPS'" errors)
// ─────────────────────────────────────────────────────────────────────────────
const PROGRESS_STEPS_GENERATE = [
  "Analysing your profile",
  "Writing CV content with AI",
  "Formatting to standard",
  "Generating PDF",
  "CV ready!",
];

const PROGRESS_STEPS_EXTRACT = [
  "Reading your uploaded CV",
  "Extracting your data with AI",
  "Structuring profile fields",
  "Saving to your profile",
  "Profile updated!",
];

const PROGRESS_STEPS_IMPROVE = [
  "Reading your existing CV",
  "Identifying improvements",
  "Rewriting with stronger language",
  "Generating updated PDF",
  "Improved CV ready!",
];

const PROGRESS_STEPS_CONVERT = [
  "Reading your existing CV",
  "Extracting all content",
  "Reformatting to new standard",
  "Generating PDF",
  "Converted CV ready!",
];

function getProgressSteps(mode: string | null): string[] {
  switch (mode) {
    case "extract":
      return PROGRESS_STEPS_EXTRACT;
    case "improve":
      return PROGRESS_STEPS_IMPROVE;
    case "convert":
      return PROGRESS_STEPS_CONVERT;
    default:
      return PROGRESS_STEPS_GENERATE;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT BADGE
// ─────────────────────────────────────────────────────────────────────────────
function FormatBadge({ format }: { format: (typeof CV_FORMATS)[0] }) {
  return (
    <View
      style={{
        width: 42,
        height: 30,
        borderRadius: 6,
        backgroundColor: `${format.color}22`,
        borderWidth: 1,
        borderColor: `${format.color}55`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: format.color }}>
        {format.flagCode}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: COLORS.fog,
          letterSpacing: 1,
          marginHorizontal: 12,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL HTML BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
function esc(s: any): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderExpSection(exp: any[]): string {
  if (!exp?.length) return "";
  return exp
    .map((e: any) => {
      const role = e.title || e.role || "";
      const company = e.company || "";
      const location = e.location || "";
      const bullets: string[] = e.achievements || e.bullets || [];
      let dates = e.dates || "";
      if (!dates) {
        dates = e.is_current
          ? `${e.start_date || ""} — Present`
          : `${e.start_date || ""} — ${e.end_date || ""}`;
      }
      const bulletHtml = bullets
        .map((b: string) => `<li>${esc(b)}</li>`)
        .join("");
      return `<div class="exp-item">
      <div class="exp-header">
        <div class="exp-left">
          <span class="exp-role">${esc(role)}</span>
          <span class="exp-sep"> · </span>
          <span class="exp-co">${esc(company)}${location ? ", " + esc(location) : ""}</span>
        </div>
        <span class="exp-date">${esc(dates)}</span>
      </div>
      <ul class="bullets">${bulletHtml}</ul>
    </div>`;
    })
    .join("");
}

function renderEduSection(edu: any[]): string {
  if (!edu?.length) return "";
  return edu
    .map((e: any) => {
      const degree = e.degree || e.qualification || "";
      const institution = e.institution || e.school || "";
      const year = e.graduation_year || e.year || "";
      const grade = e.grade || "";
      return `<div class="edu-item">
      <strong>${esc(degree)}</strong> · ${esc(institution)}${year ? " · " + esc(year) : ""}${grade ? " · " + esc(grade) : ""}
    </div>`;
    })
    .join("");
}

function buildUKHtml(d: any, profile: any): string {
  const name = d.personal?.name || profile?.full_name || "";
  const title = d.personal?.title || profile?.job_title || "";
  const email = d.personal?.email || profile?.email || "";
  const phone = d.personal?.phone || "";
  const location = d.personal?.location || "";
  const linkedin = d.personal?.linkedin || profile?.linkedin_url || "";
  const summary = d.summary || d.personal_statement || "";
  const skills = d.skills || {};
  const allSkills = [
    ...(skills.technical || []),
    ...(skills.soft || []),
    ...(skills.tools || []),
    ...(Array.isArray(d.skills) ? d.skills : []),
  ];
  const certs = d.certifications || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a1a;padding:44px 52px;max-width:800px;margin:0 auto;font-size:11pt;line-height:1.55}
.name{font-family:'Libre Baskerville',serif;font-size:30pt;font-weight:700;color:#0f2a4a;letter-spacing:-0.5px;margin-bottom:3px}
.title{font-size:13pt;color:#c9940a;font-style:italic;font-family:'Libre Baskerville',serif;margin-bottom:10px}
.contact-row{font-size:10pt;color:#444;display:flex;flex-wrap:wrap;gap:4px 18px;margin-bottom:3px}
.links-row{font-size:10pt;margin-top:4px;display:flex;gap:18px;flex-wrap:wrap}
.links-row a{color:#0f2a4a;text-decoration:none}
.section-title{font-size:9pt;font-weight:700;color:#0f2a4a;text-transform:uppercase;letter-spacing:2.5px;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #0f2a4a}
.personal-stmt{font-size:11pt;color:#333;line-height:1.7;padding:14px 18px;background:#f5f8fc;border-left:4px solid #0f2a4a;border-radius:0 4px 4px 0}
.exp-item{margin-bottom:16px}
.exp-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;flex-wrap:wrap;gap:4px}
.exp-role{font-weight:700;color:#0f2a4a;font-size:11.5pt}
.exp-sep{color:#666}
.exp-co{color:#444;font-size:11pt}
.exp-date{font-size:10pt;color:#777;white-space:nowrap;font-style:italic}
.bullets{margin:4px 0 0 18px}
.bullets li{margin-bottom:4px;color:#333}
.edu-item{margin-bottom:8px;color:#333;font-size:11pt}
.skills-grid{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.skill-pill{background:#eef2f8;color:#0f2a4a;padding:4px 12px;border-radius:3px;font-size:10pt;border:1px solid #c8d6ea}
.cert-item{margin-bottom:6px;font-size:11pt;color:#333}
.refs{margin-top:24px;font-size:10pt;color:#888;font-style:italic;border-top:1px solid #ddd;padding-top:10px;text-align:right}
</style></head><body>
  <div class="name">${esc(name)}</div>
  <div class="title">${esc(title)}</div>
  <div class="contact-row">
    ${email ? `<span>✉ ${esc(email)}</span>` : ""}
    ${phone ? `<span>✆ ${esc(phone)}</span>` : ""}
    ${location ? `<span>⊙ ${esc(location)}</span>` : ""}
  </div>
  ${linkedin ? `<div class="links-row"><a href="${esc(linkedin)}">${esc(linkedin.replace("https://", ""))}</a></div>` : ""}
  ${summary ? `<div class="section-title">Personal Statement</div><div class="personal-stmt">${esc(summary)}</div>` : ""}
  ${d.experience?.length ? `<div class="section-title">Work Experience</div>${renderExpSection(d.experience)}` : ""}
  ${d.education?.length ? `<div class="section-title">Education</div>${renderEduSection(d.education)}` : ""}
  ${allSkills.length ? `<div class="section-title">Key Skills</div><div class="skills-grid">${allSkills.map((s: string) => `<span class="skill-pill">${esc(s)}</span>`).join("")}</div>` : ""}
  ${certs.length ? `<div class="section-title">Certifications</div>${certs.map((c: any) => `<div class="cert-item">${esc(c.name || c)} ${c.issuer ? "· " + esc(c.issuer) : ""} ${c.year ? "· " + esc(c.year) : ""}</div>`).join("")}` : ""}
  <div class="refs">References available upon request</div>
</body></html>`;
}

function buildUSAHtml(d: any, profile: any): string {
  const name = d.personal?.name || profile?.full_name || "";
  const email = d.personal?.email || profile?.email || "";
  const phone = d.personal?.phone || "";
  const linkedin = d.personal?.linkedin || profile?.linkedin_url || "";
  const summary = d.summary || d.personal_statement || "";
  const skills = d.skills || {};
  const certs = d.certifications || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Roboto',sans-serif;background:#fff;color:#111;padding:30px 44px;max-width:800px;margin:0 auto;font-size:10.5pt;line-height:1.45}
.name{font-size:24pt;font-weight:700;color:#111;text-align:center;margin-bottom:4px}
.contact-line{font-size:10pt;color:#444;text-align:center;display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;margin-bottom:16px}
.contact-line a{color:#111;text-decoration:none}
.section-hdr{font-size:9.5pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#111;border-bottom:1.5px solid #111;padding-bottom:2px;margin:14px 0 8px}
.summary-text{font-size:10.5pt;color:#222;line-height:1.6}
.skills-grid{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:10pt}
.skills-cat{font-weight:700;color:#111;white-space:nowrap;align-self:start;padding-top:1px}
.exp-block{margin-bottom:13px}
.exp-top{display:flex;justify-content:space-between;margin-bottom:2px;flex-wrap:wrap;gap:2px}
.exp-title{font-weight:700;color:#111;font-size:11pt}
.exp-company{font-size:10.5pt;color:#333;font-weight:500}
.exp-date{font-size:10pt;color:#555;white-space:nowrap}
.bullets{margin-left:14px}
.bullets li{margin-bottom:3px;color:#222;font-size:10.5pt}
.edu-row{display:flex;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap}
.edu-left{font-weight:700;color:#111}
.edu-right{color:#555;font-size:10pt}
</style></head><body>
  <div class="name">${esc(name)}</div>
  <div class="contact-line">
    ${phone ? `<span>${esc(phone)}</span>` : ""}
    ${email ? `<span>${esc(email)}</span>` : ""}
    ${linkedin ? `<a href="${esc(linkedin)}">${esc(linkedin.replace("https://www.", "").replace("https://", ""))}</a>` : ""}
  </div>
  ${summary ? `<div class="section-hdr">Professional Summary</div><p class="summary-text">${esc(summary)}</p>` : ""}
  ${
    skills.technical?.length || skills.tools?.length || skills.soft?.length
      ? `
  <div class="section-hdr">Technical Skills</div>
  <div class="skills-grid">
    ${skills.technical?.length ? `<span class="skills-cat">Languages:</span><span>${skills.technical.map(esc).join(" · ")}</span>` : ""}
    ${skills.tools?.length ? `<span class="skills-cat">Cloud & Tools:</span><span>${skills.tools.map(esc).join(" · ")}</span>` : ""}
    ${skills.soft?.length ? `<span class="skills-cat">Core Skills:</span><span>${skills.soft.map(esc).join(" · ")}</span>` : ""}
  </div>`
      : ""
  }
  ${
    d.experience?.length
      ? `<div class="section-hdr">Professional Experience</div>${d.experience
          .map((e: any) => {
            const dates =
              e.dates ||
              (e.is_current
                ? `${e.start_date} – Present`
                : `${e.start_date} – ${e.end_date || ""}`);
            return `<div class="exp-block"><div class="exp-top"><div><span class="exp-title">${esc(e.title || e.role)}</span> · <span class="exp-company">${esc(e.company)}</span></div><span class="exp-date">${esc(dates)}</span></div><ul class="bullets">${(e.achievements || e.bullets || []).map((b: string) => `<li>${esc(b)}</li>`).join("")}</ul></div>`;
          })
          .join("")}`
      : ""
  }
  ${d.education?.length ? `<div class="section-hdr">Education</div>${d.education.map((e: any) => `<div class="edu-row"><span class="edu-left">${esc(e.degree)} · ${esc(e.institution)}</span><span class="edu-right">${esc(e.graduation_year || e.year || "")}${e.grade ? " · " + esc(e.grade) : ""}</span></div>`).join("")}` : ""}
  ${certs.length ? `<div class="section-hdr">Certifications</div>${certs.map((c: any) => `<div style="margin-bottom:4px;font-size:10.5pt">${esc(c.name || c)} — ${esc(c.issuer || "")}${c.year ? ", " + esc(c.year) : ""}</div>`).join("")}` : ""}
</body></html>`;
}

function buildEuropassHtml(d: any, profile: any): string {
  const name = d.personal?.name || profile?.full_name || "";
  const title = d.personal?.title || profile?.job_title || "";
  const email = d.personal?.email || profile?.email || "";
  const phone = d.personal?.phone || "";
  const location = d.personal?.location || "";
  const linkedin = d.personal?.linkedin || profile?.linkedin_url || "";
  const dob = d.personal?.dob || "";
  const nationality = d.personal?.nationality || "";
  const driving = d.personal?.driving_licence || "";
  const summary = d.summary || d.personal_statement || "";
  const langs = d.languages || [];
  const skills = d.skills || {};
  const certs = d.certifications || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Open Sans',sans-serif;background:#fff;color:#222;font-size:10.5pt;line-height:1.5}
.eu-header{background:#003399;color:#fff;padding:26px 36px 20px;display:flex;justify-content:space-between;align-items:flex-end}
.eu-name{font-size:22pt;font-weight:700;letter-spacing:0.3px;margin-bottom:4px}
.eu-title{font-size:12pt;color:#FFCC00;font-weight:600}
.eu-stars{font-size:18px;letter-spacing:2px;color:#FFCC00;opacity:0.7}
.eu-contact{background:#f0f4ff;padding:9px 36px;font-size:10.5pt;color:#333;border-bottom:1px solid #ccd5f0;display:flex;gap:20px;flex-wrap:wrap}
.eu-contact a{color:#003399;text-decoration:none}
.body-wrap{padding:18px 36px 36px}
.section-label{font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#003399;background:#e8edf8;padding:5px 10px;margin:18px 0 0;border-left:4px solid #FFCC00}
table.cv-table{width:100%;border-collapse:collapse;margin-top:4px}
table.cv-table tr{border-bottom:1px solid #eaeefc}
.dt-col{width:130px;vertical-align:top;padding:9px 12px 9px 0;font-size:10pt;color:#555;font-style:italic}
.content-col{padding:9px 0;font-size:10.5pt;vertical-align:top}
.content-col ul{margin-left:16px}
.content-col li{margin-bottom:3px}
.personal-tbl{width:100%;border-collapse:collapse;margin-top:4px}
.personal-tbl td{padding:5px 10px;font-size:10pt;border-bottom:1px solid #eaeefc}
.personal-tbl .lbl{color:#003399;font-weight:600;width:170px}
.cefr{background:#003399;color:#fff;padding:1px 9px;border-radius:3px;font-size:10pt;font-weight:600}
.cefr-mother{background:#FFCC00;color:#003399;padding:1px 9px;border-radius:3px;font-size:10pt;font-weight:700}
.declaration{font-size:10pt;color:#555;font-style:italic;padding:12px 36px;border-top:1px solid #eaeefc;margin-top:4px}
</style></head><body>
  <div class="eu-header">
    <div><div class="eu-name">${esc(name)}</div><div class="eu-title">${esc(title)}</div></div>
    <div class="eu-stars">★★★★★★★★★★★★</div>
  </div>
  <div class="eu-contact">
    ${email ? `<span>✉ ${esc(email)}</span>` : ""}
    ${phone ? `<span>✆ ${esc(phone)}</span>` : ""}
    ${location ? `<span>⊙ ${esc(location)}</span>` : ""}
    ${linkedin ? `<a href="${esc(linkedin)}">${esc(linkedin.replace("https://", ""))}</a>` : ""}
  </div>
  <div class="body-wrap">
    ${dob || nationality || driving ? `<div class="section-label">Personal Information</div><table class="personal-tbl">${dob ? `<tr><td class="lbl">Date of Birth</td><td>${esc(dob)}</td></tr>` : ""}${nationality ? `<tr><td class="lbl">Nationality</td><td>${esc(nationality)}</td></tr>` : ""}${driving ? `<tr><td class="lbl">Driving Licence</td><td>${esc(driving)}</td></tr>` : ""}</table>` : ""}
    ${summary ? `<div class="section-label">Europass Profile</div><div style="padding:12px 0;font-size:10.5pt;border-bottom:1px solid #eaeefc">${esc(summary)}</div>` : ""}
    ${
      d.experience?.length
        ? `<div class="section-label">Work Experience</div><table class="cv-table">${d.experience
            .map((e: any) => {
              const dates =
                e.dates ||
                (e.is_current
                  ? `${e.start_date} – Present`
                  : `${e.start_date} – ${e.end_date || ""}`);
              const bullets = (e.achievements || e.bullets || [])
                .map((b: string) => `<li>${esc(b)}</li>`)
                .join("");
              return `<tr><td class="dt-col">${esc(dates)}</td><td class="content-col"><strong style="color:#003399">${esc(e.title || e.role)}</strong> · ${esc(e.company)}${e.location ? ", " + esc(e.location) : ""}<ul style="margin-top:6px">${bullets}</ul></td></tr>`;
            })
            .join("")}</table>`
        : ""
    }
    ${d.education?.length ? `<div class="section-label">Education & Training</div><table class="cv-table">${d.education.map((e: any) => `<tr><td class="dt-col">${esc(e.graduation_year || e.year || "")}</td><td class="content-col"><strong>${esc(e.degree)}</strong> · ${esc(e.institution)}${e.grade ? " · " + esc(e.grade) : ""}</td></tr>`).join("")}</table>` : ""}
    ${
      langs.length
        ? `<div class="section-label">Language Skills</div><table class="cv-table">${langs
            .map((l: any) => {
              const isMother =
                l.cefr === "Native" ||
                l.cefr === "Mother tongue" ||
                l.level === "Native";
              return `<tr><td class="dt-col">${esc(l.language)}</td><td class="content-col">${isMother ? `<span class="cefr-mother">Mother Tongue</span>` : `<span class="cefr">${esc(l.cefr || l.level)}</span>`}</td></tr>`;
            })
            .join("")}</table>`
        : ""
    }
    ${skills.technical?.length || skills.tools?.length ? `<div class="section-label">Digital & Technical Skills</div><div style="padding:10px 0;font-size:10.5pt">${[...(skills.technical || []), ...(skills.tools || [])].map(esc).join(" · ")}</div>` : ""}
    ${certs.length ? `<div class="section-label">Certifications</div><table class="cv-table">${certs.map((c: any) => `<tr><td class="dt-col">${esc(c.year || "")}</td><td class="content-col">${esc(c.name || c)} — ${esc(c.issuer || "")}</td></tr>`).join("")}</table>` : ""}
  </div>
  <div class="declaration">${esc(d.declaration || "I hereby declare that the above information is true and correct to the best of my knowledge.")}</div>
</body></html>`;
}

function buildIntlHtml(d: any, profile: any): string {
  const name = d.personal?.name || profile?.full_name || "";
  const title = d.personal?.title || profile?.job_title || "";
  const email = d.personal?.email || profile?.email || "";
  const phone = d.personal?.phone || "";
  const location = d.personal?.location || "";
  const linkedin = d.personal?.linkedin || profile?.linkedin_url || "";
  const nationality = d.personal?.nationality || "";
  const dob = d.personal?.dob || "";
  const summary = d.summary || d.personal_statement || "";
  const langs = d.languages || [];
  const skills = d.skills || {};
  const certs = d.certifications || [];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Source Sans Pro',sans-serif;background:#fff;color:#1a1a1a;font-size:11pt;line-height:1.6}
.intl-header{background:#1a3a5c;color:#fff;padding:30px 40px;position:relative;overflow:hidden}
.intl-header::after{content:'';position:absolute;right:0;top:0;width:5px;height:100%;background:#e67e22}
.intl-name{font-family:'Merriweather',serif;font-size:24pt;font-weight:700;margin-bottom:5px}
.intl-title{font-size:13pt;color:#f0a500;font-weight:600;margin-bottom:10px}
.intl-contact{font-size:10pt;color:rgba(255,255,255,0.8);display:flex;gap:16px;flex-wrap:wrap}
.intl-contact a{color:#f0a500;text-decoration:none}
.body-wrap{padding:22px 40px}
.section-hdr{font-family:'Merriweather',serif;font-size:10.5pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:1.5px;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid #e67e22}
.pi-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px}
.pi-row{display:flex;gap:8px;font-size:10.5pt;padding:4px 0;border-bottom:1px solid #f0f0f0}
.pi-lbl{font-weight:700;color:#1a3a5c;min-width:130px}
.exec-stmt{font-size:11pt;line-height:1.75;color:#333;border-left:4px solid #e67e22;padding:12px 16px;background:#fef9f3}
.exp-item{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f0f0f0}
.exp-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;flex-wrap:wrap;gap:4px}
.exp-role{font-family:'Merriweather',serif;font-weight:700;font-size:12.5pt;color:#1a3a5c}
.exp-co{font-size:11pt;color:#e67e22;font-weight:600;margin-bottom:6px}
.exp-date{font-size:10pt;color:#777;font-style:italic;white-space:nowrap}
.bullets{margin-left:18px}
.bullets li{margin-bottom:5px;color:#333}
.edu-item{margin-bottom:10px}
.edu-deg{font-weight:700;color:#1a3a5c;font-size:11.5pt}
.edu-inst{color:#555;font-size:11pt}
.lang-table{width:100%;border-collapse:collapse}
.lang-table tr{border-bottom:1px solid #e8eef5}
.lang-table th{text-align:left;padding:7px 10px;font-size:10pt;color:#1a3a5c;background:#f0f4fa}
.lang-table td{padding:7px 10px;font-size:10.5pt}
</style></head><body>
  <div class="intl-header">
    <div class="intl-name">${esc(name)}</div>
    <div class="intl-title">${esc(title)}</div>
    <div class="intl-contact">
      ${email ? `<span>✉ ${esc(email)}</span>` : ""}
      ${phone ? `<span>✆ ${esc(phone)}</span>` : ""}
      ${location ? `<span>${esc(location)}</span>` : ""}
      ${linkedin ? `<a href="${esc(linkedin)}">LinkedIn</a>` : ""}
    </div>
  </div>
  <div class="body-wrap">
    ${nationality || dob ? `<div class="section-hdr">Personal Information</div><div class="pi-grid">${nationality ? `<div class="pi-row"><span class="pi-lbl">Nationality:</span><span>${esc(nationality)}</span></div>` : ""}${dob ? `<div class="pi-row"><span class="pi-lbl">Date of Birth:</span><span>${esc(dob)}</span></div>` : ""}</div>` : ""}
    ${summary ? `<div class="section-hdr">Executive Summary</div><div class="exec-stmt">${esc(summary)}</div>` : ""}
    ${
      d.experience?.length
        ? `<div class="section-hdr">Professional Experience</div>${d.experience
            .map((e: any) => {
              const dates =
                e.dates ||
                (e.is_current
                  ? `${e.start_date} — Present`
                  : `${e.start_date} — ${e.end_date || ""}`);
              const bullets = (e.achievements || e.bullets || [])
                .map((b: string) => `<li>${esc(b)}</li>`)
                .join("");
              return `<div class="exp-item"><div class="exp-top"><div><div class="exp-role">${esc(e.title || e.role)}</div><div class="exp-co">${esc(e.company)}${e.location ? "  |  " + esc(e.location) : ""}</div></div><div class="exp-date">${esc(dates)}</div></div><ul class="bullets">${bullets}</ul></div>`;
            })
            .join("")}`
        : ""
    }
    ${d.education?.length ? `<div class="section-hdr">Academic Qualifications</div>${d.education.map((e: any) => `<div class="edu-item"><div class="edu-deg">${esc(e.degree)}${e.grade ? " · " + esc(e.grade) : ""}</div><div class="edu-inst">${esc(e.institution)}${e.graduation_year || e.year ? " · " + esc(e.graduation_year || e.year) : ""}</div></div>`).join("")}` : ""}
    ${langs.length ? `<div class="section-hdr">Language Proficiency</div><table class="lang-table"><tr><th>Language</th><th>Proficiency</th></tr>${langs.map((l: any) => `<tr><td>${esc(l.language)}</td><td>${esc(l.level || "")}${l.cefr ? " (" + esc(l.cefr) + ")" : ""}</td></tr>`).join("")}</table>` : ""}
    ${certs.length ? `<div class="section-hdr">Certifications & Professional Development</div>${certs.map((c: any) => `<div style="margin-bottom:8px;font-size:11pt"><strong>${esc(c.name || c)}</strong>${c.issuer ? " — " + esc(c.issuer) : ""}${c.year ? ", " + esc(c.year) : ""}</div>`).join("")}` : ""}
    <div class="section-hdr">Professional References</div>
    <p style="font-style:italic;color:#555;font-size:11pt">${esc(typeof d.references === "string" ? d.references : "Available upon request")}</p>
  </div>
</body></html>`;
}

function buildLocalHTML(cv: any, profile: any): string {
  const d = cv.cv_data || {};
  const style = normaliseCVStyle(cv.cv_style);
  switch (style) {
    case "uk":
      return buildUKHtml(d, profile);
    case "usa":
      return buildUSAHtml(d, profile);
    case "european":
      return buildEuropassHtml(d, profile);
    case "international":
      return buildIntlHtml(d, profile);
    default:
      return buildUKHtml(d, profile);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function CVScreen() {
  const { user, profile } = useAuthStore();
  const { showToast } = useUIStore();

  const [cvs, setCVs] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [viewingCV, setViewingCV] = useState<any | null>(null);
  const [shareOptionCV, setShareOptionCV] = useState<any | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [uploadedCVText, setUploadedCVText] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const completeness = (profile as any)?.profile_completeness ?? 0;
  const isBelowThreshold = completeness < 40;

  // The current progress steps array depends on which mode is active
  const currentSteps = getProgressSteps(importMode);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    loadCVs();
  }, []);

  const loadCVs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("user_cvs")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false });
      setCVs(data || []);
    } catch (err) {
      console.error("loadCVs error:", err);
    }
  }, [user]);

  const handlePickCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadedFileName(asset.name);
      try {
        const text = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "utf8",
        });
        setUploadedCVText(text);
      } catch {
        setUploadedCVText(
          `[File: ${asset.name} — CV uploaded for AI improvement]`,
        );
      }
      setImportMode(null);
    } catch {
      showToast("Could not read file. Try a .txt or .pdf.", "error");
    }
  };

  const clearUpload = () => {
    setUploadedCVText(null);
    setUploadedFileName(null);
    setImportMode(null);
  };

  const handleGeneratePress = () => {
    if (importMode === "extract") {
      generateCV();
      return;
    }
    if (!selectedFormat)
      return showToast("Select a format to continue", "error");
    if (uploadedFileName && !importMode)
      return showToast("Choose what to do with your uploaded CV", "error");
    generateCV();
  };

  const startProgressAnimation = (mode: string | null) => {
    setProgressStep(0);
    const steps = getProgressSteps(mode);
    let step = 0;
    progressRef.current = setInterval(() => {
      step += 1;
      if (step < steps.length - 1) {
        setProgressStep(step);
      } else {
        if (progressRef.current) clearInterval(progressRef.current);
      }
    }, 6000);
  };

  // ── generateCV — FIXED ──────────────────────────────────────────────────────
  // BUG FIX: old code had `importMode !== "extract"` which caused extract mode
  // to always send mode:"generate". Now each mode is handled explicitly.
  const generateCV = async () => {
    if (!user) return;
    setGenerating(true);
    const activeMode = importMode;
    startProgressAnimation(activeMode);

    try {
      let requestBody: Record<string, unknown> = {};

      if (activeMode === "extract" && uploadedCVText) {
        requestBody = {
          mode: "extract",
          existing_cv_text: uploadedCVText,
          cv_style: "uk",
          target_country: "UK",
        };
      } else if (
        (activeMode === "improve" || activeMode === "convert") &&
        uploadedCVText
      ) {
        requestBody = {
          mode: activeMode,
          existing_cv_text: uploadedCVText,
          cv_style: selectedFormat ?? "uk",
          target_country: selectedFormat ?? "uk",
        };
      } else {
        requestBody = {
          mode: "generate",
          cv_style: selectedFormat ?? "uk",
          target_country: selectedFormat ?? "uk",
        };
      }

      const { data, error } = await supabase.functions.invoke(
        "trigger-cv-generation",
        { method: "POST", body: requestBody },
      );

      if (progressRef.current) clearInterval(progressRef.current);
      setProgressStep(getProgressSteps(activeMode).length - 1);

      if (error) {
        // Network/auth error from Supabase itself
        showToast(error.message || "CV generation failed", "error");
        return;
      }

      // Check for application-level errors returned as success:false
      if (data && data.success === false) {
        // Show the specific error message from n8n/edge function
        const msg = data.message || "Operation failed";
        showToast(msg, "error");
        // Don't clear upload so user can try again with a different file
        return;
      }

      // All good
      if (activeMode === "extract") {
        showToast("Profile updated from your CV! ✓", "success");
        clearUpload();
        const { fetchProfile } = useAuthStore.getState();
        await fetchProfile(user.id);
      } else {
        showToast("CV generated! Check your email.", "success");
        clearUpload();
        setTimeout(() => loadCVs(), 1500);
      }
    } catch (err: unknown) {
      showToast((err as Error).message || "Failed to generate CV", "error");
    } finally {
      if (progressRef.current) clearInterval(progressRef.current);
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async (cv: any) => {
    if (!cv.pdf_url) return showToast("PDF not available for this CV", "error");
    try {
      await Linking.openURL(cv.pdf_url);
    } catch {
      showToast("Could not open PDF", "error");
    }
  };

  const handleSendEmail = async (cv: any) => {
    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke(
        "trigger-cv-generation",
        {
          method: "POST",
          body: { action: "resend_email", cv_record_id: cv.id },
        },
      );
      if (error) throw new Error(error.message);
      showToast("CV sent to your email!", "success");
      setShareOptionCV(null);
    } catch (err: unknown) {
      showToast((err as Error).message || "Email failed", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShareLink = async (cv: any) => {
    if (!cv.pdf_url) return showToast("No PDF link available", "error");
    try {
      await Share.share({ message: `My CV: ${cv.pdf_url}`, url: cv.pdf_url });
    } catch {}
    setShareOptionCV(null);
  };

  const handleDeleteCV = (cv: any) => {
    Alert.alert(
      "Delete CV",
      `Delete this ${formatLabel(cv.cv_style)}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("user_cvs")
                .delete()
                .eq("id", cv.id)
                .eq("user_id", user!.id);
              if (error) throw error;
              setCVs((prev) => prev.filter((c) => c.id !== cv.id));
              showToast("CV deleted", "success");
            } catch (err: any) {
              showToast(err.message || "Could not delete CV", "error");
            }
          },
        },
      ],
    );
  };

  const formatLabel = (key: string) => {
    const norm = normaliseCVStyle(key);
    return CV_FORMATS.find((f) => f.key === norm)?.title || key;
  };

  // ── CV VIEWER ──────────────────────────────────────────────────────────────
  if (viewingCV) {
    const normStyle = normaliseCVStyle(viewingCV.cv_style);
    const format = CV_FORMATS.find((f) => f.key === normStyle);
    const localHtml = buildLocalHTML(viewingCV, profile);
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <SafeAreaView style={{ backgroundColor: COLORS.navy }}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              onPress={() => setViewingCV(null)}
              style={styles.viewerBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={COLORS.snow} />
            </TouchableOpacity>
            <Text
              variant="label"
              color={COLORS.snow}
              style={{ flex: 1, textAlign: "center" }}
            >
              {format?.title || formatLabel(viewingCV.cv_style)}
            </Text>
            {viewingCV.pdf_url && (
              <TouchableOpacity
                onPress={() => handleDownloadPDF(viewingCV)}
                style={styles.viewerBtn}
                activeOpacity={0.7}
              >
                <DownloadSimple size={20} color={COLORS.gold} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setViewingCV(null);
                setShareOptionCV(viewingCV);
              }}
              style={[styles.viewerBtn, { marginLeft: 8 }]}
              activeOpacity={0.7}
            >
              <ShareNetwork size={20} color={COLORS.indigo} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <WebView
          source={{ html: localHtml, baseUrl: "https://fonts.googleapis.com" }}
          style={{ flex: 1 }}
          originWhitelist={["*"]}
          showsVerticalScrollIndicator
          startInLoadingState
          renderLoading={() => (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={COLORS.indigo} size="large" />
            </View>
          )}
        />
      </View>
    );
  }

  // ── SHARE SHEET ────────────────────────────────────────────────────────────
  if (shareOptionCV) {
    const normStyle = normaliseCVStyle(shareOptionCV.cv_style);
    const format = CV_FORMATS.find((f) => f.key === normStyle);
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
        <LinearGradient
          colors={["rgba(79,70,229,0.08)", "transparent"]}
          style={StyleSheet.absoluteFill}
        />
        <Toast />
        <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={styles.shareSheet}>
            <View style={styles.shareHandle} />
            <Text variant="h3" style={{ marginBottom: 4 }}>
              Share Your CV
            </Text>
            <Text
              variant="caption"
              color={COLORS.slate}
              style={{ marginBottom: 24 }}
            >
              {format?.title || formatLabel(shareOptionCV.cv_style)}
            </Text>
            <TouchableOpacity
              style={styles.shareRow}
              onPress={() => handleSendEmail(shareOptionCV)}
              disabled={sendingEmail}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.shareIcon,
                  { backgroundColor: "rgba(79,70,229,0.15)" },
                ]}
              >
                <EnvelopeSimple
                  size={20}
                  color={COLORS.indigo}
                  weight="duotone"
                />
              </View>
              <View>
                <Text variant="label" color={COLORS.snow}>
                  Send to Email
                </Text>
                <Text variant="caption" color={COLORS.slate}>
                  {sendingEmail ? "Sending…" : "Get a download link via email"}
                </Text>
              </View>
            </TouchableOpacity>
            {shareOptionCV.pdf_url && (
              <TouchableOpacity
                style={styles.shareRow}
                onPress={() => handleShareLink(shareOptionCV)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.shareIcon,
                    { backgroundColor: "rgba(16,185,129,0.15)" },
                  ]}
                >
                  <PaperPlaneRight
                    size={20}
                    color={COLORS.emerald}
                    weight="duotone"
                  />
                </View>
                <View>
                  <Text variant="label" color={COLORS.snow}>
                    Share PDF Link
                  </Text>
                  <Text variant="caption" color={COLORS.slate}>
                    Copy link or send to apps
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {shareOptionCV.pdf_url && (
              <TouchableOpacity
                style={styles.shareRow}
                onPress={() => handleDownloadPDF(shareOptionCV)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.shareIcon,
                    { backgroundColor: "rgba(201,148,10,0.15)" },
                  ]}
                >
                  <DownloadSimple
                    size={20}
                    color={COLORS.gold}
                    weight="duotone"
                  />
                </View>
                <View>
                  <Text variant="label" color={COLORS.snow}>
                    Download PDF
                  </Text>
                  <Text variant="caption" color={COLORS.slate}>
                    Open PDF in browser
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <Button
              title="Close"
              variant="ghost"
              onPress={() => setShareOptionCV(null)}
              style={{ marginTop: 16 }}
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── MAIN LIST ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.abyss }}>
      <LinearGradient
        colors={["rgba(79,70,229,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />
      <Toast />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ opacity: fadeAnim, flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text variant="h1">CV Builder</Text>
              <Text variant="caption" color={COLORS.slate}>
                Country-specific CVs in minutes
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <FileText size={22} color={COLORS.gold} weight="duotone" />
            </View>
          </View>

          {/* Profile completeness warning */}
          {isBelowThreshold && !generating && (
            <TouchableOpacity
              style={styles.completenessWarning}
              onPress={() => router.push("/(tabs)/profile/edit" as any)}
              activeOpacity={0.8}
            >
              <Warning size={18} color={COLORS.gold} weight="fill" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  variant="label"
                  color={COLORS.snow}
                  style={{ marginBottom: 2 }}
                >
                  Your profile is {completeness}% complete
                </Text>
                <Text variant="caption" color={COLORS.slate}>
                  Complete your profile to get a better CV — your CV will have
                  gaps
                </Text>
              </View>
              <View style={styles.fillProfileBtn}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: COLORS.gold,
                  }}
                >
                  Fill Profile
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Generation progress ─────────────────────────────────────── */}
          {generating && (
            <GlassCard style={{ marginBottom: 20 }} padding={20}>
              <Text
                variant="label"
                color={COLORS.snow}
                style={{ marginBottom: 14 }}
              >
                {importMode === "extract"
                  ? "Extracting profile data…"
                  : importMode === "improve"
                    ? "Improving your CV…"
                    : importMode === "convert"
                      ? "Converting your CV…"
                      : "Generating your CV…"}
              </Text>
              <View style={{ gap: 10 }}>
                {currentSteps.map((step, i) => (
                  <View
                    key={step}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    {i < progressStep ? (
                      <CheckCircle
                        size={16}
                        color={COLORS.emerald}
                        weight="fill"
                      />
                    ) : i === progressStep ? (
                      <ActivityIndicator size={14} color={COLORS.indigo} />
                    ) : (
                      <Clock size={16} color={COLORS.fog} />
                    )}
                    <Text
                      variant="caption"
                      color={i <= progressStep ? COLORS.snow : COLORS.fog}
                      weight={i === progressStep ? "semibold" : "regular"}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          {!generating && (
            <>
              {/* ── Import section ──────────────────────────────────────── */}
              <GlassCard style={styles.importCard} padding={16}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <UploadSimple
                    size={18}
                    color={COLORS.slate}
                    weight="duotone"
                  />
                  <Text variant="label" color={COLORS.snow}>
                    Import Existing CV
                  </Text>
                </View>
                <Text
                  variant="caption"
                  color={COLORS.fog}
                  style={{ marginBottom: 14 }}
                >
                  Upload PDF or Word to convert, improve, or extract your data
                </Text>

                {!uploadedFileName ? (
                  <TouchableOpacity
                    style={styles.uploadBtn}
                    onPress={handlePickCV}
                    activeOpacity={0.8}
                  >
                    <UploadSimple
                      size={18}
                      color={COLORS.indigo}
                      weight="duotone"
                    />
                    <Text
                      variant="label"
                      color={COLORS.indigo}
                      style={{ marginLeft: 10 }}
                    >
                      Choose File
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.fileChipRow}>
                      <View style={styles.fileChip}>
                        <FilePdf size={16} color={COLORS.emerald} />
                        <Text
                          variant="caption"
                          color={COLORS.emerald}
                          style={{ marginLeft: 6, flex: 1 }}
                          numberOfLines={1}
                        >
                          {uploadedFileName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={clearUpload}
                        style={{ padding: 4 }}
                      >
                        <X size={18} color={COLORS.slate} />
                      </TouchableOpacity>
                    </View>

                    <Text
                      variant="caption"
                      color={COLORS.fog}
                      style={{ marginTop: 14, marginBottom: 10 }}
                    >
                      What would you like to do?
                    </Text>
                    <View style={{ gap: 8 }}>
                      {IMPORT_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const selected = importMode === mode.key;
                        return (
                          <TouchableOpacity
                            key={mode.key}
                            onPress={() => setImportMode(mode.key)}
                            activeOpacity={0.8}
                            style={[
                              styles.importModeCard,
                              selected && {
                                borderColor: mode.color,
                                backgroundColor: `${mode.color}14`,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.importModeIcon,
                                { backgroundColor: `${mode.color}18` },
                              ]}
                            >
                              <Icon
                                size={16}
                                color={mode.color}
                                weight="duotone"
                              />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text
                                variant="label"
                                color={selected ? COLORS.snow : COLORS.slate}
                              >
                                {mode.label}
                              </Text>
                              <Text variant="caption" color={COLORS.fog}>
                                {mode.desc}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.radio,
                                selected && { borderColor: mode.color },
                              ]}
                            >
                              {selected && (
                                <View
                                  style={[
                                    styles.radioDot,
                                    { backgroundColor: mode.color },
                                  ]}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </GlassCard>

              {/* ── Generate section ────────────────────────────────────── */}
              <SectionDivider label="Generate New CV" />

              <View style={{ gap: 10, marginBottom: 20, marginTop: 4 }}>
                {CV_FORMATS.map((format) => {
                  const selected = selectedFormat === format.key;
                  return (
                    <TouchableOpacity
                      key={format.key}
                      onPress={() => setSelectedFormat(format.key)}
                      activeOpacity={0.8}
                      style={[
                        styles.formatCard,
                        selected && {
                          borderWidth: 2.5,
                          borderColor: format.color,
                          backgroundColor: `${format.color}20`,
                        },
                      ]}
                    >
                      <FormatBadge format={format} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 2,
                          }}
                        >
                          <Text
                            variant="label"
                            color={selected ? COLORS.snow : COLORS.slate}
                          >
                            {format.title}
                          </Text>
                          <View
                            style={[
                              styles.tagPill,
                              {
                                backgroundColor: `${format.color}22`,
                                borderColor: `${format.color}44`,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                color: format.color,
                                fontWeight: "700",
                                letterSpacing: 0.5,
                              }}
                            >
                              {format.tag}
                            </Text>
                          </View>
                        </View>
                        <Text
                          variant="caption"
                          color={selected ? format.accentColor : COLORS.fog}
                        >
                          {format.subtitle}
                        </Text>
                        <Text
                          variant="caption"
                          color={COLORS.fog}
                          style={{ marginTop: 2 }}
                        >
                          {format.description}
                        </Text>
                      </View>
                      {selected ? (
                        <CheckCircle
                          size={22}
                          color={format.color}
                          weight="fill"
                        />
                      ) : (
                        <View style={styles.radio}>
                          <View style={styles.radioDotEmpty} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title={(() => {
                  if (uploadedFileName && importMode) {
                    if (importMode === "convert") {
                      return selectedFormat
                        ? `Convert to ${CV_FORMATS.find((f) => f.key === selectedFormat)?.title || "New Format"}`
                        : "Select a Format to Convert To";
                    }
                    if (importMode === "improve") return "AI Improve My CV";
                    if (importMode === "extract")
                      return "Extract Data to My Profile";
                  }
                  if (selectedFormat) {
                    return `Generate ${CV_FORMATS.find((f) => f.key === selectedFormat)?.title || "CV"}`;
                  }
                  return "Select a Format to Continue";
                })()}
                onPress={handleGeneratePress}
                disabled={
                  (!selectedFormat && importMode !== "extract") ||
                  (!!uploadedFileName && !importMode)
                }
                size="lg"
                style={{ marginBottom: 28 }}
              />
            </>
          )}

          {/* ── Your CVs ──────────────────────────────────────────────── */}
          {cvs.length > 0 && (
            <>
              <SectionDivider label="Your CVs" />
              <View style={{ gap: 12, marginTop: 4, marginBottom: 40 }}>
                {cvs.map((cv) => {
                  const normStyle = normaliseCVStyle(cv.cv_style);
                  const fmt = CV_FORMATS.find((f) => f.key === normStyle);
                  const d = cv.cv_data || {};
                  const summary = d.summary || d.personal_statement || "";
                  return (
                    <View
                      key={cv.id}
                      style={[
                        styles.cvCard,
                        { borderLeftColor: fmt?.accentColor || COLORS.indigo },
                      ]}
                    >
                      <View style={styles.cvCardHeader}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {fmt && <FormatBadge format={fmt} />}
                          <Text variant="label" color={COLORS.snow}>
                            {fmt?.title || formatLabel(cv.cv_style)}
                          </Text>
                        </View>
                        {cv.is_active && (
                          <StatusBadge label="Active" variant="success" dot />
                        )}
                      </View>

                      <Text
                        variant="caption"
                        color={COLORS.fog}
                        style={{ marginBottom: 6 }}
                      >
                        Generated{" "}
                        {new Date(cv.generated_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>

                      {summary.length > 0 && (
                        <Text
                          variant="caption"
                          color={COLORS.slate}
                          style={{ lineHeight: 18, marginBottom: 12 }}
                          numberOfLines={2}
                        >
                          {summary}
                        </Text>
                      )}

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          onPress={() => setViewingCV(cv)}
                          style={[
                            styles.actionBtn,
                            {
                              borderColor: `${fmt?.color || COLORS.indigo}55`,
                              backgroundColor: `${fmt?.color || COLORS.indigo}14`,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Eye size={16} color={fmt?.color || COLORS.indigo} />
                          <Text
                            variant="caption"
                            color={fmt?.color || COLORS.indigo}
                            style={{ marginLeft: 6, fontWeight: "600" }}
                          >
                            View
                          </Text>
                        </TouchableOpacity>

                        {cv.pdf_url && (
                          <TouchableOpacity
                            onPress={() => handleDownloadPDF(cv)}
                            style={[
                              styles.actionBtn,
                              {
                                borderColor: "rgba(201,148,10,0.4)",
                                backgroundColor: "rgba(201,148,10,0.1)",
                              },
                            ]}
                            activeOpacity={0.8}
                          >
                            <DownloadSimple size={16} color={COLORS.gold} />
                            <Text
                              variant="caption"
                              color={COLORS.gold}
                              style={{ marginLeft: 6, fontWeight: "600" }}
                            >
                              PDF
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => setShareOptionCV(cv)}
                          style={[
                            styles.actionBtn,
                            {
                              borderColor: "rgba(79,70,229,0.4)",
                              backgroundColor: "rgba(79,70,229,0.1)",
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <ShareNetwork size={16} color={COLORS.indigo} />
                          <Text
                            variant="caption"
                            color={COLORS.indigo}
                            style={{ marginLeft: 6, fontWeight: "600" }}
                          >
                            Share
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteCV(cv)}
                          style={[
                            styles.actionBtn,
                            {
                              borderColor: "rgba(244,63,94,0.4)",
                              backgroundColor: "rgba(244,63,94,0.08)",
                              maxWidth: 44,
                              flex: 0,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Trash size={16} color={COLORS.rose} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {cvs.length === 0 && !generating && (
            <GlassCard
              padding={24}
              style={{ alignItems: "center", marginBottom: 40 }}
            >
              <Sparkle size={32} color={COLORS.fog} weight="duotone" />
              <Text
                variant="body"
                color={COLORS.slate}
                align="center"
                style={{ marginTop: 12 }}
              >
                Generate your first CV above. It'll be emailed to you and saved
                here.
              </Text>
            </GlassCard>
          )}
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 130 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(201,148,10,0.12)",
    borderWidth: 1,
    borderColor: "rgba(201,148,10,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  completenessWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  fillProfileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.4)",
  },
  importCard: {
    marginBottom: 20,
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: COLORS.rim,
    borderRadius: 16,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: `${COLORS.indigo}55`,
    borderStyle: "dashed",
  },
  fileChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
    flex: 1,
  },
  importModeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  importModeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.rim,
  },
  formatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    borderWidth: 1.5,
    borderColor: COLORS.rim,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.rim,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioDotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
  cvCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.rim,
    borderLeftWidth: 4,
    padding: 16,
  },
  cvCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.navy,
  },
  viewerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  shareSheet: {
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: COLORS.rim,
  },
  shareHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.rim,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rim,
  },
  shareIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
